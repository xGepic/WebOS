import { createWebOS } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

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

    expect(webos.countdowns.shown().map(({ title, label, days, relative }) => ({ title, label, days, relative }))).toEqual([
      { title: 'Holidays', label: 'Fri, Nov 13', days: 1, relative: 'Tomorrow' },
      { title: 'Release 2.0', label: 'Tue, Dec 1', days: 19, relative: 'in 19 days' },
      { title: 'Vienna City Marathon', label: 'Sun, Apr 18, 2027', days: 157, relative: 'in 157 days' },
    ]);
  });

  it('says "Today" on the day itself, and leaves a Countdown out once its day has passed', async () => {
    const { webos, clock } = await setUp();
    await webos.countdowns.add({ title: 'Demo day', date: '2026-11-13' });

    clock.advance(DAY);
    expect(webos.countdowns.shown().map((countdown) => countdown.relative)).toEqual(['Today']);

    clock.advance(DAY);
    expect(webos.countdowns.shown()).toEqual([]);
  });

  it('counts whole calendar days across a daylight-saving change', async () => {
    // Clocks go back on Oct 25, 2026 in Vienna: that day is 25 hours long.
    const { webos } = await setUp({ clock: createTestClock(new Date(2026, 9, 24, 23, 30)) });
    await webos.countdowns.add({ title: 'After the change', date: '2026-10-26' });

    expect(webos.countdowns.shown()[0].days).toBe(2);
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

describe('Countdowns that count up', () => {
  const view = (webos: Awaited<ReturnType<typeof setUp>>['webos']) =>
    webos.countdowns.shown().map(({ title, days, countsUp, relative }) => ({ title, days, countsUp, relative }));

  it('counts up from a day that had passed when it was added, after the ones still to come', async () => {
    const { webos } = await setUp();
    await webos.countdowns.add({ title: 'Started running', date: '2026-10-01' });
    await webos.countdowns.add({ title: 'Release 2.0', date: '2026-12-01' });
    await webos.countdowns.add({ title: 'Moved to Vienna', date: '2026-11-11' });

    expect(view(webos)).toEqual([
      { title: 'Release 2.0', days: 19, countsUp: false, relative: 'in 19 days' },
      { title: 'Moved to Vienna', days: 1, countsUp: true, relative: 'Yesterday' },
      { title: 'Started running', days: 42, countsUp: true, relative: '42 days ago' },
    ]);
  });

  it('keeps counting up in every new tab, while one that was ahead is still cleared once its day has passed', async () => {
    const { webos, storage, clock } = await setUp();
    await webos.countdowns.add({ title: 'Started running', date: '2026-10-01' });
    await webos.countdowns.add({ title: 'Demo day', date: '2026-11-13' });

    clock.advance(2 * DAY);
    const nextTab = await createWebOS({ storage, clock });

    expect(view(nextTab)).toEqual([{ title: 'Started running', days: 44, countsUp: true, relative: '44 days ago' }]);
    expect(nextTab.countdowns.list().map((countdown) => countdown.title)).toEqual(['Started running']);
  });

  it('counts up or down after a change, by whether the new day has passed', async () => {
    const { webos, storage, clock } = await setUp();
    const id = (await webos.countdowns.add({ title: 'Race', date: '2026-12-01' }))!;

    await webos.countdowns.edit(id, { title: 'Race', date: '2026-11-01' });
    expect(view(webos)).toEqual([{ title: 'Race', days: 11, countsUp: true, relative: '11 days ago' }]);

    await webos.countdowns.edit(id, { title: 'Race', date: '2026-11-13' });
    expect(view(webos)).toEqual([{ title: 'Race', days: 1, countsUp: false, relative: 'Tomorrow' }]);

    // Moved back to a coming day, it counts down again, and is cleared once that day has passed.
    clock.advance(2 * DAY);
    expect((await createWebOS({ storage, clock })).countdowns.list()).toEqual([]);
  });

  it('counts down to a day added for today', async () => {
    const { webos } = await setUp();
    await webos.countdowns.add({ title: 'Launch', date: '2026-11-12' });

    expect(view(webos)).toEqual([{ title: 'Launch', days: 0, countsUp: false, relative: 'Today' }]);
  });
});
