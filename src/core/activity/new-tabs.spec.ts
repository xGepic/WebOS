import { createWebOS } from '../index';
import { createMemoryStorage, createTestClock, type TestClock } from '../testing';

/** Sunday, Nov 15 2026, 9 PM: the week shown runs from Monday the 9th. */
const SUNDAY_EVENING = new Date(2026, 10, 15, 21, 0);
const HOUR = 3_600_000;

async function setUp(storage = createMemoryStorage(), clock: TestClock = createTestClock(SUNDAY_EVENING)) {
  const webos = await createWebOS({ storage, clock });
  return { webos, storage, clock };
}

/** Each shown day as "date count", oldest first. */
const counts = (webos: Awaited<ReturnType<typeof setUp>>['webos']) => webos.newTabs.view().days.map((day) => `${day.date} ${day.count}`);

describe('the New Tabs Widget', () => {
  it('shows today and the six days before it, oldest first, with none counted yet', async () => {
    const { webos } = await setUp();

    const view = webos.newTabs.view();

    expect(view.today).toBe(0);
    expect(view.most).toBe(1);
    expect(view.days.map((day) => day.letter).join('')).toBe('MTWTFSS');
    expect(view.days[0]).toEqual({ date: '2026-11-09', letter: 'M', label: 'Mon, Nov 9', count: 0, today: false });
    expect(view.days[6]).toEqual({ date: '2026-11-15', letter: 'S', label: 'Sun, Nov 15', count: 0, today: true });
    expect(view.days.filter((day) => day.today)).toHaveLength(1);
  });

  it('counts each new tab today, and keeps the count for the next tab', async () => {
    const { webos, storage } = await setUp();

    await webos.newTabs.count();
    await webos.newTabs.count();
    await webos.newTabs.count();

    expect(webos.newTabs.view().today).toBe(3);
    expect(webos.newTabs.view().most).toBe(3);
    const nextTab = await setUp(storage);
    expect(nextTab.webos.newTabs.view().today).toBe(3);
  });

  it('starts the new day at 0 at midnight, without a new tab, keeping yesterday', async () => {
    const { webos, clock } = await setUp();
    await webos.newTabs.count();
    await webos.newTabs.count();

    clock.advance(3 * HOUR);

    expect(webos.newTabs.view().today).toBe(0);
    expect(counts(webos).slice(-2)).toEqual(['2026-11-15 2', '2026-11-16 0']);
    expect(webos.newTabs.view().days[6].letter).toBe('M');
  });

  it('drops days older than the six before today with the next count', async () => {
    const { storage } = await setUp();
    const document = (await storage.read()) as Record<string, unknown>;
    const stored = createMemoryStorage({ ...document, newTabs: { '2026-11-01': 40, '2026-11-08': 30, '2026-11-09': 20, '2026-11-14': 10 } });
    const { webos } = await setUp(stored);

    expect(counts(webos)).toEqual([
      '2026-11-09 20',
      '2026-11-10 0',
      '2026-11-11 0',
      '2026-11-12 0',
      '2026-11-13 0',
      '2026-11-14 10',
      '2026-11-15 0',
    ]);

    await webos.newTabs.count();

    expect(await stored.read()).toMatchObject({ newTabs: { '2026-11-09': 20, '2026-11-14': 10, '2026-11-15': 1 } });
    expect(Object.keys(((await stored.read()) as { newTabs: object }).newTabs)).toHaveLength(3);
  });

  it("reads a count that isn't a whole number from 0 up as 0, and counts on from there", async () => {
    const { storage } = await setUp();
    const document = (await storage.read()) as Record<string, unknown>;
    const { webos } = await setUp(
      createMemoryStorage({ ...document, newTabs: { '2026-11-12': -3, '2026-11-13': 'many', '2026-11-14': 2.5, '2026-11-15': null } }),
    );

    expect(counts(webos).map((day) => day.split(' ')[1])).toEqual(['0', '0', '0', '0', '0', '0', '0']);

    await webos.newTabs.count();
    expect(webos.newTabs.view().today).toBe(1);
  });

  it('follows a new tab counted in another tab', async () => {
    const storage = createMemoryStorage();
    const { webos } = await setUp(storage);
    const other = await setUp(storage.openTab());

    await webos.newTabs.count();
    await other.webos.newTabs.count();

    expect(webos.newTabs.view().today).toBe(2);
    expect(other.webos.newTabs.view().today).toBe(2);
  });

  it('starts a Desktop from before New Tabs with none counted', async () => {
    const { storage } = await setUp();
    const { newTabs: _, ...v23 } = (await storage.read()) as Record<string, unknown>;

    const migrated = await setUp(createMemoryStorage({ ...v23, schemaVersion: 23 }));

    expect(migrated.webos.newTabs.view().today).toBe(0);
    expect(await migrated.storage.read()).toMatchObject({ schemaVersion: 24, newTabs: {} });
  });

  it('goes into a backup, and comes back with it', async () => {
    const { webos } = await setUp();
    await webos.newTabs.count();
    await webos.newTabs.count();

    const restored = await setUp();
    await restored.webos.backup.import(webos.backup.export().text);

    expect(restored.webos.newTabs.view().today).toBe(2);
  });

  it('refuses a backup without New Tabs as damaged', async () => {
    const { webos } = await setUp();
    const { newTabs: _, ...file } = JSON.parse(webos.backup.export().text);

    await expect(webos.backup.import(JSON.stringify(file))).rejects.toThrow(/damaged/);
  });
});
