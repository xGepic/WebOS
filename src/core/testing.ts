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

/** An in-memory Storage, as seen from one tab. */
export interface MemoryStorage extends Storage {
  /** Another tab's view of the same stored document. Its writes are external changes here, and the other way round. */
  openTab(): MemoryStorage;
}

/**
 * A Storage that keeps the document in memory, optionally starting with one.
 * Like extension storage, it copies on the way in and out, so callers never
 * share an object with what is stored.
 */
export function createMemoryStorage(initial?: unknown): MemoryStorage {
  const shared = { stored: structuredClone(initial), tabs: new Set<(document: unknown) => void>() };

  function openTab(): MemoryStorage {
    const listeners = new Set<(document: unknown) => void>();
    const deliver = (document: unknown) => listeners.forEach((listener) => listener(structuredClone(document)));
    shared.tabs.add(deliver);

    return {
      read: async () => structuredClone(shared.stored),
      write: async (document) => {
        shared.stored = structuredClone(document);
        shared.tabs.forEach((tab) => tab !== deliver && tab(shared.stored));
      },
      onExternalChange(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      openTab,
    };
  }

  return openTab();
}
