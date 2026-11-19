import { createWebOS } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

async function setUp(storage = createMemoryStorage()) {
  const webos = await createWebOS({ storage, clock: createTestClock(new Date(2026, 10, 15, 12, 0)) });
  return { webos, storage };
}

describe('Ambient mode', () => {
  it('starts after five minutes, and offers 1, 5 or 15', async () => {
    const { webos } = await setUp();

    expect(webos.ambient.after()).toBe(5);
    expect(webos.ambient.choices).toEqual([1, 5, 15]);
  });

  it('keeps the minutes chosen, or off, for every new tab', async () => {
    const { webos, storage } = await setUp();

    await webos.ambient.setAfter(15);
    expect((await setUp(storage)).webos.ambient.after()).toBe(15);

    await webos.ambient.setAfter(null);
    expect((await setUp(storage)).webos.ambient.after()).toBeNull();
  });

  it('follows a choice made in another tab', async () => {
    const storage = createMemoryStorage();
    const { webos } = await setUp(storage);
    const other = await setUp(storage.openTab());

    await other.webos.ambient.setAfter(1);

    expect(webos.ambient.after()).toBe(1);
  });

  it("starts after five minutes for minutes this build doesn't offer", async () => {
    const { storage } = await setUp();
    const document = (await storage.read()) as Record<string, unknown>;

    const newer = await setUp(createMemoryStorage({ ...document, ambientAfter: 30 }));

    expect(newer.webos.ambient.after()).toBe(5);
  });

  it('gives a Desktop from before Ambient mode five minutes', async () => {
    const { storage } = await setUp();
    const { ambientAfter: _, ...v26 } = (await storage.read()) as Record<string, unknown>;

    const migrated = await setUp(createMemoryStorage({ ...v26, schemaVersion: 26 }));

    expect(migrated.webos.ambient.after()).toBe(5);
    expect(await migrated.storage.read()).toMatchObject({ schemaVersion: 29, ambientAfter: 5 });
  });

  it('goes into a backup, and comes back with it', async () => {
    const { webos } = await setUp();
    await webos.ambient.setAfter(null);
    const file = webos.backup.export();

    const restored = await setUp();
    await restored.webos.backup.import(file.text);

    expect(restored.webos.ambient.after()).toBeNull();
  });

  it('refuses a backup without it as damaged', async () => {
    const { webos } = await setUp();
    const { ambientAfter: _, ...file } = JSON.parse(webos.backup.export().text);

    await expect(webos.backup.import(JSON.stringify(file))).rejects.toThrow(/damaged/);
  });
});
