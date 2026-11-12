import type { Clock, Storage } from './edges';

const MINUTE = 60_000;

/** A Clock whose time only moves when the test says so. */
export interface TestClock extends Clock {
  /** Moves time forward, calling minute listeners at each minute boundary crossed. */
  advance(ms: number): void;
}

export function createTestClock(start: Date): TestClock {
  let current = start.getTime();
  const listeners = new Set<() => void>();

  return {
    now: () => new Date(current),
    onMinute(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    advance(ms) {
      const target = current + ms;
      let nextMinute = Math.floor(current / MINUTE) * MINUTE + MINUTE;
      while (nextMinute <= target) {
        current = nextMinute;
        listeners.forEach((listener) => listener());
        nextMinute += MINUTE;
      }
      current = target;
    },
  };
}

/**
 * A Storage that keeps the document in memory, optionally starting with one.
 * Like extension storage, it copies on the way in and out, so callers never
 * share an object with what is stored.
 */
export function createMemoryStorage(initial?: unknown): Storage {
  let stored = structuredClone(initial);
  return {
    read: async () => structuredClone(stored),
    write: async (document) => {
      stored = structuredClone(document);
    },
  };
}
