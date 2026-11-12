import { createWebOS } from './index';
import { createMemoryStorage, createTestClock } from './testing';

const DAY = 86_400_000;

async function setUp({ storage = createMemoryStorage(), clock = createTestClock(new Date(2026, 10, 12, 9, 0)) } = {}) {
  return { webos: await createWebOS({ storage, clock }), storage, clock };
}

describe('Countdowns', () => {
  it('counts the days to each one, soonest first', async () => {
    const { webos } = await setUp();
    await webos.countdowns.add({ title: 'Vienna City Marathon', date: '2027-04-18' });
    await webos.countdowns.add({ title: 'Release 2.0', date: '2026-12-01' });
    await webos.countdowns.add({ title: 'Holidays', date: '2026-11-13' });

    expect(webos.countdowns.upcoming().map(({ title, label, days, relative }) => ({ title, label, days, relative }))).toEqual([
      { title: 'Holidays', label: 'Fri, Nov 13', days: 1, relative: 'Tomorrow' },
      { title: 'Release 2.0', label: 'Tue, Dec 1', days: 19, relative: 'in 19 days' },
      { title: 'Vienna City Marathon', label: 'Sun, Apr 18, 2027', days: 157, relative: 'in 157 days' },
    ]);
  });

  it('says "Today" on the day itself, and leaves a Countdown out once its day has passed', async () => {
    const { webos, clock } = await setUp();
    await webos.countdowns.add({ title: 'Demo day', date: '2026-11-13' });

    clock.advance(DAY);
    expect(webos.countdowns.upcoming().map((countdown) => countdown.relative)).toEqual(['Today']);

    clock.advance(DAY);
    expect(webos.countdowns.upcoming()).toEqual([]);
  });

  it('counts whole calendar days across a daylight-saving change', async () => {
    // Clocks go back on Oct 25, 2026 in Vienna: that day is 25 hours long.
    const { webos } = await setUp({ clock: createTestClock(new Date(2026, 9, 24, 23, 30)) });
    await webos.countdowns.add({ title: 'After the change', date: '2026-10-26' });

    expect(webos.countdowns.upcoming()[0].days).toBe(2);
  });

  it('clears Countdowns whose day has passed when the Desktop loads, and keeps today\'s', async () => {
    const { webos, storage, clock } = await setUp();
    await webos.countdowns.add({ title: 'Past', date: '2026-11-12' });
    await webos.countdowns.add({ title: 'Later', date: '2026-11-14' });

    clock.advance(2 * DAY);
    const nextTab = await createWebOS({ storage, clock });

    expect(nextTab.countdowns.list().map((countdown) => countdown.title)).toEqual(['Later']);
    expect((await storage.read()) as { countdowns: unknown[] }).toMatchObject({ countdowns: [{ title: 'Later' }] });
  });

  it('refuses a blank title or a date that isn\'t real, and trims the title', async () => {
    const { webos } = await setUp();

    expect(await webos.countdowns.add({ title: '   ', date: '2026-12-01' })).toBeUndefined();
    expect(await webos.countdowns.add({ title: 'Nope', date: '2026-02-30' })).toBeUndefined();
    expect(await webos.countdowns.add({ title: 'Nope', date: 'soon' })).toBeUndefined();
    expect(await webos.countdowns.add({ title: '  Launch  ', date: '2026-12-01' })).toEqual(expect.any(String));

    expect(webos.countdowns.list().map((countdown) => countdown.title)).toEqual(['Launch']);
  });

  it('edits and deletes a Countdown', async () => {
    const { webos } = await setUp();
    const id = (await webos.countdowns.add({ title: 'Launch', date: '2026-12-01' }))!;

    expect(await webos.countdowns.edit(id, { title: 'Launch 2.0', date: '2026-12-08' })).toBe(true);
    expect(await webos.countdowns.edit(id, { title: '', date: '2026-12-08' })).toBe(false);
    expect(webos.countdowns.list()).toEqual([{ id, title: 'Launch 2.0', date: '2026-12-08' }]);

    await webos.countdowns.delete(id);
    expect(webos.countdowns.list()).toEqual([]);
  });

  it('lists every Countdown soonest first for Settings, and keeps them for the next tab', async () => {
    const { webos, storage, clock } = await setUp();
    await webos.countdowns.add({ title: 'B', date: '2027-01-01' });
    await webos.countdowns.add({ title: 'A', date: '2026-12-24' });

    const nextTab = await createWebOS({ storage, clock });

    expect(nextTab.countdowns.list().map((countdown) => countdown.title)).toEqual(['A', 'B']);
  });
});
