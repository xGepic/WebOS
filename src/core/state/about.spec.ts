import { createWebOS } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

const DAY = 86_400_000;
const NOV_12 = new Date(2026, 10, 12, 9, 0);

async function setUp(storage = createMemoryStorage(), clock = createTestClock(NOV_12)) {
  const webos = await createWebOS({ storage, clock });
  return { webos, storage, clock };
}

/** The number in a "48 KB" or "2.1 MB" size, in KB. */
const kilobytes = (size: string) => {
  const [, amount, unit] = /^([\d.]+) (bytes|KB|MB)$/.exec(size)!;
  return Number(amount) * (unit === 'MB' ? 1024 : unit === 'KB' ? 1 : 1 / 1024);
};

describe('About webOS', () => {
  it('names the schema version, and says there has been no backup yet', async () => {
    const { webos } = await setUp();

    expect(webos.about.view()).toMatchObject({ schemaVersion: 26, lastBackup: 'Never', backupDue: true });
  });

  it('counts an export as the last backup, and the days since it', async () => {
    const { webos, clock } = await setUp();

    webos.backup.export();
    expect(webos.about.view()).toMatchObject({ lastBackup: 'Today', backupDue: false });

    clock.advance(DAY);
    expect(webos.about.view()).toMatchObject({ lastBackup: 'Yesterday', backupDue: false });
    clock.advance(28 * DAY);
    expect(webos.about.view()).toMatchObject({ lastBackup: '29 days ago', backupDue: false });
    clock.advance(DAY);
    expect(webos.about.view()).toMatchObject({ lastBackup: '30 days ago', backupDue: true });
  });

  it('remembers the last backup in a new tab', async () => {
    const { webos, storage, clock } = await setUp();
    webos.backup.export();
    await Promise.resolve();

    clock.advance(3 * DAY);
    const { webos: newTab } = await setUp(storage, clock);

    expect(newTab.about.view().lastBackup).toBe('3 days ago');
  });

  it('keeps this machine’s last backup when a backup is imported', async () => {
    const { webos: other } = await setUp();
    other.backup.export();
    const file = other.backup.export();
    const { webos } = await setUp();

    await webos.backup.import(file.text);

    expect(webos.about.view().lastBackup).toBe('Never');
  });

  it('measures the storage webOS uses', async () => {
    const { webos } = await setUp();
    const fresh = kilobytes(webos.about.view().storage);
    expect(fresh).toBeGreaterThan(0);
    expect(fresh).toBeLessThan(20);

    await webos.notes.create('x'.repeat(200 * 1024));
    expect(kilobytes(webos.about.view().storage)).toBeCloseTo(fresh + 200, -1);

    await webos.notes.create('x'.repeat(2 * 1024 * 1024));
    expect(webos.about.view().storage).toMatch(/^2\.\d MB$/);
  });

  it('gives a version 25 document no backup yet', async () => {
    // A fresh document taken back to version 25, before webOS kept the last backup.
    const fresh = createMemoryStorage();
    await setUp(fresh);
    const { lastBackupAt: _, ...current } = (await fresh.read()) as Record<string, unknown>;
    const storage = createMemoryStorage({ ...current, schemaVersion: 25 });

    const { webos } = await setUp(storage);

    expect(webos.about.view().lastBackup).toBe('Never');
    expect(await storage.read()).toMatchObject({ schemaVersion: 26, lastBackupAt: null });
  });
});
