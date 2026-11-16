import { createWebOS } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

const MINUTE = 60_000;

async function setUp(storage = createMemoryStorage(), clock = createTestClock(new Date(2026, 10, 16, 15, 30))) {
  const webos = await createWebOS({ storage, clock });
  return { webos, storage, clock };
}

describe('the Clock face', () => {
  it('shows digits until changed', async () => {
    const { webos } = await setUp();

    expect(webos.clock.face()).toBe('digital');
  });

  it('keeps the analog clock, once chosen, for every new tab, and goes back to digits', async () => {
    const { webos, storage } = await setUp();

    await webos.clock.setFace('analog');
    expect((await setUp(storage)).webos.clock.face()).toBe('analog');

    await webos.clock.setFace('digital');
    expect((await setUp(storage)).webos.clock.face()).toBe('digital');
  });

  it('follows a choice made in another tab', async () => {
    const storage = createMemoryStorage();
    const { webos } = await setUp(storage);
    const other = await setUp(storage.openTab());

    await other.webos.clock.setFace('analog');

    expect(webos.clock.face()).toBe('analog');
  });

  it("shows digits for a face this build doesn't know", async () => {
    const { storage } = await setUp();
    const document = (await storage.read()) as Record<string, unknown>;

    const newer = await setUp(createMemoryStorage({ ...document, clockFace: 'binary' }));

    expect(newer.webos.clock.face()).toBe('digital');
  });

  it('gives a Desktop from before the analog Clock its digits', async () => {
    const { storage } = await setUp();
    const { clockFace: _, ...v27 } = (await storage.read()) as Record<string, unknown>;

    const migrated = await setUp(createMemoryStorage({ ...v27, schemaVersion: 27 }));

    expect(migrated.webos.clock.face()).toBe('digital');
    expect(await migrated.storage.read()).toMatchObject({ schemaVersion: 28, clockFace: 'digital' });
  });

  it('goes into a backup, and comes back with it', async () => {
    const { webos } = await setUp();
    await webos.clock.setFace('analog');
    const file = webos.backup.export();

    const restored = await setUp();
    await restored.webos.backup.import(file.text);

    expect(restored.webos.clock.face()).toBe('analog');
  });

  it('refuses a backup without it as damaged', async () => {
    const { webos } = await setUp();
    const { clockFace: _, ...file } = JSON.parse(webos.backup.export().text);

    await expect(webos.backup.import(JSON.stringify(file))).rejects.toThrow(/damaged/);
  });
});

describe('the analog Clock hands', () => {
  it('points the hour hand between the hours as the minutes go by', async () => {
    const { webos } = await setUp();

    // 3:30 PM: the hour hand halfway between 3 and 4, the minute hand on 6.
    expect(webos.clock.hands()).toEqual({ hour: 105, minute: 180, second: 0 });
  });

  it('steps the minute hand once a minute, and gives the second hand to the millisecond', async () => {
    const { webos, clock } = await setUp();

    clock.advance(MINUTE + 15_500);

    expect(webos.clock.hands()).toEqual({ hour: 105.5, minute: 186, second: 93 });
  });

  it('points straight up at midnight and noon', async () => {
    const midnight = await setUp(createMemoryStorage(), createTestClock(new Date(2026, 10, 16, 0, 0)));
    const noon = await setUp(createMemoryStorage(), createTestClock(new Date(2026, 10, 16, 12, 0)));

    expect(midnight.webos.clock.hands()).toEqual({ hour: 0, minute: 0, second: 0 });
    expect(noon.webos.clock.hands()).toEqual({ hour: 0, minute: 0, second: 0 });
  });
});
