import { createWebOS } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

async function setUp(storage = createMemoryStorage()) {
  const webos = await createWebOS({ storage, clock: createTestClock(new Date(2026, 10, 14, 12, 0)) });
  return { webos, storage };
}

describe('the Wallpaper', () => {
  it('starts on Midnight, and offers five', async () => {
    const { webos } = await setUp();

    expect(webos.wallpaper.current()).toBe('midnight');
    expect(webos.wallpaper.choices.map((wallpaper) => wallpaper.name)).toEqual(['Midnight', 'Aurora', 'Ember', 'Violet', 'Graphite']);
  });

  it('keeps the one chosen, for every new tab', async () => {
    const { webos, storage } = await setUp();

    await webos.wallpaper.choose('ember');

    expect(webos.wallpaper.current()).toBe('ember');
    const nextTab = await setUp(storage);
    expect(nextTab.webos.wallpaper.current()).toBe('ember');
  });

  it('follows a choice made in another tab', async () => {
    const storage = createMemoryStorage();
    const { webos } = await setUp(storage);
    const other = await setUp(storage.openTab());

    await other.webos.wallpaper.choose('violet');

    expect(webos.wallpaper.current()).toBe('violet');
  });

  it("shows Midnight for a Wallpaper this build doesn't know", async () => {
    const { webos, storage } = await setUp();
    const document = (await storage.read()) as Record<string, unknown>;

    const newer = await setUp(createMemoryStorage({ ...document, wallpaper: 'nebula' }));

    expect(newer.webos.wallpaper.current()).toBe('midnight');
    expect(webos.wallpaper.current()).toBe('midnight');
  });

  it('gives a Desktop from before Wallpapers the one it had: Midnight', async () => {
    const { storage } = await setUp();
    const { wallpaper: _, ...v22 } = (await storage.read()) as Record<string, unknown>;

    const migrated = await setUp(createMemoryStorage({ ...v22, schemaVersion: 22 }));

    expect(migrated.webos.wallpaper.current()).toBe('midnight');
    expect(await migrated.storage.read()).toMatchObject({ schemaVersion: 23, wallpaper: 'midnight' });
  });

  it('goes into a backup, and comes back with it', async () => {
    const { webos } = await setUp();
    await webos.wallpaper.choose('aurora');
    const file = webos.backup.export();

    const restored = await setUp();
    await restored.webos.backup.import(file.text);

    expect(restored.webos.wallpaper.current()).toBe('aurora');
  });

  it('refuses a backup without a Wallpaper as damaged', async () => {
    const { webos } = await setUp();
    const { wallpaper: _, ...file } = JSON.parse(webos.backup.export().text);

    await expect(webos.backup.import(JSON.stringify(file))).rejects.toThrow(/damaged/);
  });
});
