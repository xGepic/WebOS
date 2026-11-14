import type { SystemMonitor } from '../core';

/**
 * The machine's processors (their use and name) and memory, through the extension `system.cpu` and
 * `system.memory` permissions. Outside the extension (`ng serve`) there is
 * none, and the System Widget says so.
 */
export function createSystemMonitor(): SystemMonitor | undefined {
  const cpu = globalThis.chrome?.system?.cpu;
  const memory = globalThis.chrome?.system?.memory;
  if (!cpu || !memory) return undefined;
  return {
    async sample() {
      const [processors, ram] = await Promise.all([cpu.getInfo(), memory.getInfo()]);
      const sum = (pick: (usage: chrome.system.cpu.CpuTime) => number) =>
        processors.processors.reduce((total, processor) => total + pick(processor.usage), 0);
      return {
        cpuTotal: sum((usage) => usage.total),
        cpuIdle: sum((usage) => usage.idle),
        cores: processors.numOfProcessors,
        memoryCapacity: ram.capacity,
        memoryAvailable: ram.availableCapacity,
        cpuModel: processors.modelName,
      };
    },
  };
}
