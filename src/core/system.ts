import type { SystemSample } from './edges';

/** What the System Widget shows. */
export type SystemView =
  | { status: 'unavailable' | 'loading' }
  | {
      status: 'ready';
      /** Processor use across all cores since the last reading, in whole percent. */
      cpu: number;
      /** The last readings' processor use, oldest first, each 0–1: the sparkline. */
      cpuHistory: readonly number[];
      cores: number;
      /** How much of the memory is in use, 0–1. */
      memory: number;
      /** e.g. "11.2 GB" */
      memoryUsed: string;
      /** e.g. "16 GB" */
      memoryTotal: string;
    };

/** This tab's readings so far. Kept per tab, never saved. */
export interface SystemReadings {
  last?: SystemSample;
  /** Processor use between consecutive readings, oldest first, each 0–1. */
  cpuHistory: number[];
  /** Whether the last reading failed. */
  failed: boolean;
}

/** How many readings the sparkline keeps: a minute's worth at one every two seconds. */
export const CPU_HISTORY = 30;
const GB = 1024 ** 3;

export const noReadings = (): SystemReadings => ({ cpuHistory: [], failed: false });

/** The readings with `sample` added: processor use is the share of processor time since the last one that wasn't idle. */
export function addReading(readings: SystemReadings, sample: SystemSample): SystemReadings {
  const { last } = readings;
  const elapsed = last ? sample.cpuTotal - last.cpuTotal : 0;
  if (!last || elapsed <= 0) return { ...readings, last: sample, failed: false };
  const busy = Math.min(1, Math.max(0, 1 - (sample.cpuIdle - last.cpuIdle) / elapsed));
  return { last: sample, cpuHistory: [...readings.cpuHistory, busy].slice(-CPU_HISTORY), failed: false };
}

const gigabytes = (bytes: number, digits: number) => `${(bytes / GB).toFixed(digits)} GB`;

/** What the Widget shows for this tab's readings. Unavailable without a way to read them. */
export function systemView(readings: SystemReadings, available: boolean): SystemView {
  const { last, cpuHistory } = readings;
  if (!available || (readings.failed && !last)) return { status: 'unavailable' };
  if (!last || !cpuHistory.length) return { status: 'loading' };
  const used = Math.max(0, last.memoryCapacity - last.memoryAvailable);
  return {
    status: 'ready',
    cpu: Math.round(cpuHistory.at(-1)! * 100),
    cpuHistory,
    cores: last.cores,
    memory: last.memoryCapacity ? used / last.memoryCapacity : 0,
    memoryUsed: gigabytes(used, 1),
    memoryTotal: gigabytes(last.memoryCapacity, 0),
  };
}
