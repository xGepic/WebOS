import { createWebOS, type SystemSample } from '../index';
import { createMemoryStorage, createTestClock, createTestSystemMonitor } from '../testing';

const GB = 1024 ** 3;
const sample = (cpuTotal: number, cpuIdle: number, memoryAvailable = 4 * GB): SystemSample => ({
  cpuTotal,
  cpuIdle,
  cores: 8,
  memoryCapacity: 16 * GB,
  memoryAvailable,
});

async function setUp(first: SystemSample | Error = sample(1000, 800)) {
  const system = createTestSystemMonitor(first);
  const webos = await createWebOS({ storage: createMemoryStorage(), clock: createTestClock(new Date(2026, 10, 12, 9, 0)), system });
  return { webos, system };
}

describe('the System Widget', () => {
  it('needs two readings to know how busy the processors are', async () => {
    const { webos, system } = await setUp();
    expect(webos.system.view()).toEqual({ status: 'loading' });

    await webos.system.sample();
    expect(webos.system.view()).toEqual({ status: 'loading' });

    // 400 units of processor time passed, 100 of them idle: 75% busy.
    system.next = sample(1400, 900);
    await webos.system.sample();

    expect(webos.system.view()).toEqual({
      status: 'ready',
      cpu: 75,
      cpuHistory: [0.75],
      cores: 8,
      memory: 0.75,
      memoryUsed: '12.0 GB',
      memoryTotal: '16 GB',
    });
  });

  it('keeps the last thirty readings for the sparkline', async () => {
    const { webos, system } = await setUp(sample(0, 0));
    await webos.system.sample();

    for (let i = 1; i <= 40; i++) {
      system.next = sample(i * 100, i * 50);
      await webos.system.sample();
    }

    const view = webos.system.view();
    expect(view.status === 'ready' && view.cpuHistory).toHaveLength(30);
  });

  it('is unavailable without a way to read the machine, or when reading fails', async () => {
    const without = await createWebOS({ storage: createMemoryStorage(), clock: createTestClock(new Date(2026, 10, 12, 9, 0)) });
    await without.system.sample();
    expect(without.system.view()).toEqual({ status: 'unavailable' });

    const { webos } = await setUp(new Error('no permission'));
    await webos.system.sample();
    expect(webos.system.view()).toEqual({ status: 'unavailable' });
  });

  it('keeps showing the last readings when one fails', async () => {
    const { webos, system } = await setUp();
    await webos.system.sample();
    system.next = sample(1400, 900);
    await webos.system.sample();

    system.next = new Error('busy');
    await webos.system.sample();

    expect(webos.system.view()).toMatchObject({ status: 'ready', cpu: 75 });
  });
});
