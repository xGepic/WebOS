import { createWebOS, type DisplayReading, type NetworkReading, type SystemSample } from '../index';
import {
  createMemoryStorage,
  createTestClock,
  createTestDisplayMonitor,
  createTestNetworkMonitor,
  createTestSystemMonitor,
  type MemoryStorage,
} from '../testing';

const GB = 1024 ** 3;
const sample = (cpuTotal: number, cpuIdle: number, memoryAvailable = 4 * GB, cpuModel?: string): SystemSample => ({
  cpuTotal,
  cpuIdle,
  cores: 8,
  memoryCapacity: 16 * GB,
  memoryAvailable,
  ...(cpuModel ? { cpuModel } : {}),
});

const monitor4k: DisplayReading = { name: 'DELL U2723QE', width: 3840, height: 2160, scale: 1.5, primary: true, refreshRate: 144 };
const laptop: DisplayReading = { name: 'Built-in display', width: 2560, height: 1600, scale: 2, primary: false };

async function setUp({
  first = sample(1000, 800),
  network = { online: true, downlinkMbps: 10, rttMs: 50 } as NetworkReading,
  displays = [monitor4k] as DisplayReading[],
  storage = createMemoryStorage() as MemoryStorage,
}: { first?: SystemSample | Error; network?: NetworkReading; displays?: DisplayReading[]; storage?: MemoryStorage } = {}) {
  const system = createTestSystemMonitor(first);
  const networkMonitor = createTestNetworkMonitor(network);
  const displayMonitor = createTestDisplayMonitor(displays);
  const webos = await createWebOS({
    storage,
    clock: createTestClock(new Date(2026, 10, 12, 9, 0)),
    system,
    network: networkMonitor,
    displays: displayMonitor,
  });
  // The displays are read as the core starts.
  await Promise.resolve();
  return { webos, system, network: networkMonitor, displays: displayMonitor, storage };
}

describe('the System Widget’s meters', () => {
  it('need two readings to know how busy the processors are', async () => {
    const { webos, system } = await setUp();
    expect(webos.system.view().usage).toEqual({ status: 'loading' });

    await webos.system.sample();
    expect(webos.system.view().usage).toEqual({ status: 'loading' });

    // 400 units of processor time passed, 100 of them idle: 75% busy.
    system.next = sample(1400, 900);
    await webos.system.sample();

    expect(webos.system.view().usage).toEqual({
      status: 'ready',
      cpu: 75,
      cpuHistory: [0.75],
      cores: 8,
      memory: 0.75,
      memoryUsed: '12.0 GB',
      memoryTotal: '16 GB',
    });
  });

  it('keep the last thirty readings for the sparkline', async () => {
    const { webos, system } = await setUp({ first: sample(0, 0) });
    await webos.system.sample();

    for (let i = 1; i <= 40; i++) {
      system.next = sample(i * 100, i * 50);
      await webos.system.sample();
    }

    const usage = webos.system.view().usage;
    expect(usage.status === 'ready' && usage.cpuHistory).toHaveLength(30);
  });

  it('are unavailable without a way to read the machine, or when reading fails', async () => {
    const without = await createWebOS({ storage: createMemoryStorage(), clock: createTestClock(new Date(2026, 10, 12, 9, 0)) });
    await without.system.sample();
    expect(without.system.view().usage).toEqual({ status: 'unavailable' });

    const { webos } = await setUp({ first: new Error('no permission') });
    await webos.system.sample();
    expect(webos.system.view().usage).toEqual({ status: 'unavailable' });
  });

  it('keep showing the last readings when one fails', async () => {
    const { webos, system } = await setUp();
    await webos.system.sample();
    system.next = sample(1400, 900);
    await webos.system.sample();

    system.next = new Error('busy');
    await webos.system.sample();

    expect(webos.system.view().usage).toMatchObject({ status: 'ready', cpu: 75 });
  });
});

describe('the processor', () => {
  it.each([
    ['Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz', 'Intel Core i7-9700K'],
    ['12th Gen Intel(R) Core(TM) i7-12700K', '12th Gen Intel Core i7-12700K'],
    ['AMD Ryzen 7 7800X3D 8-Core Processor', 'AMD Ryzen 7 7800X3D'],
    ['AMD Ryzen 7 5800H with Radeon Graphics', 'AMD Ryzen 7 5800H'],
    ['Apple M2 Pro', 'Apple M2 Pro'],
  ])('names “%s” as “%s”', async (model, name) => {
    const { webos } = await setUp({ first: sample(1000, 800, 4 * GB, model) });

    await webos.system.sample();

    expect(webos.system.view().processor).toBe(name);
  });

  it('is unknown before the first reading', async () => {
    const { webos } = await setUp();

    expect(webos.system.view().processor).toBeUndefined();
  });
});

describe('the network', () => {
  it.each([
    [{ online: true, downlinkMbps: 10, rttMs: 50 }, 'Online · 10+ Mbps · 50 ms'],
    [{ online: true, downlinkMbps: 4.6, rttMs: 125 }, 'Online · 5 Mbps · 125 ms'],
    [{ online: true, downlinkMbps: 0.4, rttMs: 900 }, 'Online · 0.4 Mbps · 900 ms'],
    [{ online: true, downlinkMbps: 0, rttMs: 0 }, 'Online'],
    [{ online: true }, 'Online'],
    [{ online: false, downlinkMbps: 10, rttMs: 50 }, 'Offline'],
  ])('sums up %o as “%s”', async (network, summary) => {
    const { webos } = await setUp({ network });

    expect(webos.system.view().network).toEqual({ online: network.online, summary });
  });

  it('follows going offline at once', async () => {
    const { webos, network } = await setUp();
    let told = 0;
    webos.subscribe(() => told++);

    network.change({ online: false });

    expect(told).toBeGreaterThan(0);
    expect(webos.system.view().network).toEqual({ online: false, summary: 'Offline' });
  });

  it('is unknown without a way to tell', async () => {
    const webos = await createWebOS({ storage: createMemoryStorage(), clock: createTestClock(new Date(2026, 10, 12, 9, 0)) });

    expect(webos.system.view().network).toBeUndefined();
  });
});

describe('the displays', () => {
  it('lists each with its resolution, scaling and refresh rate, the primary first', async () => {
    const { webos } = await setUp({ displays: [laptop, monitor4k] });

    expect(webos.system.view().displays).toEqual([
      { name: 'DELL U2723QE', summary: '3840 × 2160 · 150% · 144 Hz', primary: true },
      { name: 'Built-in display', summary: '2560 × 1600 · 200%', primary: false },
    ]);
  });

  it('follows a display being plugged in', async () => {
    const { webos, displays } = await setUp();

    displays.change([monitor4k, laptop]);
    await Promise.resolve();

    expect(webos.system.view().displays.map((display) => display.name)).toEqual(['DELL U2723QE', 'Built-in display']);
  });

  it('lists none without a way to tell', async () => {
    const webos = await createWebOS({ storage: createMemoryStorage(), clock: createTestClock(new Date(2026, 10, 12, 9, 0)) });

    expect(webos.system.view().displays).toEqual([]);
  });
});

describe('choosing what the System Widget shows', () => {
  it('shows every part to begin with', async () => {
    const { webos } = await setUp();

    expect(webos.system.parts()).toEqual([
      { part: 'cpu', name: 'CPU use', shown: true },
      { part: 'memory', name: 'Memory', shown: true },
      { part: 'processor', name: 'Processor name', shown: true },
      { part: 'network', name: 'Network', shown: true },
      { part: 'displays', name: 'Displays', shown: true },
    ]);
    expect(webos.system.view().shown).toEqual({ cpu: true, memory: true, processor: true, network: true, displays: true });
  });

  it('hides and shows parts, and remembers it in the next tab', async () => {
    const { webos, storage } = await setUp();

    await webos.system.setShown('memory', false);
    await webos.system.setShown('displays', false);
    await webos.system.setShown('memory', true);

    expect(webos.system.view().shown).toMatchObject({ memory: true, displays: false });
    const { webos: nextTab } = await setUp({ storage });
    expect(nextTab.system.parts().filter((part) => !part.shown).map((part) => part.part)).toEqual(['displays']);
  });

  it('shows parts it doesn’t know were hidden, and keeps names from other builds', async () => {
    const storage = createMemoryStorage();
    const { webos } = await setUp({ storage });
    await webos.system.setShown('network', false);
    const stored = (await storage.read()) as { systemWidget: { hidden: string[] } };
    await storage.write({ ...stored, systemWidget: { hidden: ['battery', 'network'] } });

    const { webos: nextTab } = await setUp({ storage });
    await nextTab.system.setShown('cpu', false);

    expect(nextTab.system.view().shown).toEqual({ cpu: false, memory: true, processor: true, network: false, displays: true });
    expect(await storage.read()).toMatchObject({ systemWidget: { hidden: ['battery', 'network', 'cpu'] } });
  });

  it('keeps the choice in a backup', async () => {
    const { webos } = await setUp();
    await webos.system.setShown('processor', false);

    const backup = webos.backup.export().text;
    await webos.system.setShown('processor', true);
    await webos.backup.import(backup);

    expect(webos.system.view().shown.processor).toBe(false);
  });
});
