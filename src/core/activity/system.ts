import type { NetworkReading, SystemSample } from '../edges';

/** The parts the System Widget can show, in the order it shows them. */
export const SYSTEM_PARTS = ['cpu', 'memory', 'processor', 'network'] as const;
export type SystemPart = (typeof SYSTEM_PARTS)[number];

/** What Settings calls each part. */
const PART_NAMES: Record<SystemPart, string> = {
  cpu: 'CPU use',
  memory: 'Memory',
  processor: 'Processor name',
  network: 'Network',
};

/** A part as Settings lists it. */
export interface SystemPartChoice {
  part: SystemPart;
  name: string;
  shown: boolean;
}

/** What the System Widget shows: which parts, and what is known for each. */
export interface SystemView {
  shown: Readonly<Record<SystemPart, boolean>>;
  /** The CPU and memory meters. */
  usage: UsageView;
  /** The processor's name, tidied, once a reading has given it. */
  processor?: string;
  /** "Offline", or "Online · 10+ Mbps · 50 ms". Undefined without a way to tell. */
  network?: { online: boolean; summary: string };
}

/** The CPU and memory meters. */
export type UsageView =
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
interface SystemReadings {
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

/** The meters for this tab's readings. Unavailable without a way to read them. */
export function usageView(readings: SystemReadings, available: boolean): UsageView {
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

/** The parts as Settings lists them, with whether each is shown. Parts not in `hidden` are shown, including ones added later. */
export function partChoices(hidden: readonly string[]): SystemPartChoice[] {
  return SYSTEM_PARTS.map((part) => ({ part, name: PART_NAMES[part], shown: !hidden.includes(part) }));
}

/** Whether each part is shown. */
export function shownParts(hidden: readonly string[]): Record<SystemPart, boolean> {
  return Object.fromEntries(SYSTEM_PARTS.map((part) => [part, !hidden.includes(part)])) as Record<SystemPart, boolean>;
}

/** `hidden` with `part` shown or hidden, keeping names this build doesn't know. */
export function withShown(hidden: readonly string[], part: SystemPart, shown: boolean): string[] {
  const others = hidden.filter((name) => name !== part);
  return shown ? others : [...others, part];
}

/**
 * A processor's name without the trademarks, clock speed and core count the
 * system adds: "Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz" is "Intel Core i7-9700K",
 * "AMD Ryzen 7 5800X 8-Core Processor" is "AMD Ryzen 7 5800X".
 */
export function processorName(model: string): string {
  return model
    .replace(/\((R|TM|tm|r)\)|[®™]/g, '')
    .replace(/@\s*[\d.]+\s*[GM]Hz/i, '')
    .replace(/\s+(with|w\/)\s+Radeon.*$/i, '')
    .replace(/\s+\d+-Core Processor\b/i, '')
    .replace(/\s+(CPU|Processor)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Offline", or what the browser estimates of the connection: "Online · 10+ Mbps · 50 ms". */
export function networkSummary(reading: NetworkReading): string {
  if (!reading.online) return 'Offline';
  const parts = ['Online'];
  const { downlinkMbps: downlink, rttMs: rtt } = reading;
  // Chromium caps the estimate at 10 Mbps; zero means it doesn't know.
  if (downlink) parts.push(downlink >= 10 ? '10+ Mbps' : `${downlink < 1 ? downlink.toFixed(1) : Math.round(downlink)} Mbps`);
  if (rtt) parts.push(`${Math.round(rtt)} ms`);
  return parts.join(' · ');
}
