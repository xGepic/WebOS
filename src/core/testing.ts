import type { BrowserLookup, BrowserPage, Clock, Fetch, Storage, VisitedPage } from './edges';

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

/**
 * A BrowserLookup over the given bookmarks and history. Like the browser, it
 * finds pages whose title or URL contains the query, ignoring case.
 */
export function createTestBrowser({
  bookmarks = [],
  history = [],
}: { bookmarks?: BrowserPage[]; history?: VisitedPage[] } = {}): BrowserLookup {
  const matching = <T extends BrowserPage>(pages: T[], query: string) =>
    pages.filter((page) => `${page.title} ${page.url}`.toLowerCase().includes(query.toLowerCase()));
  return {
    bookmarks: async (query) => structuredClone(matching(bookmarks, query)),
    history: async (query) => structuredClone(matching(history, query)),
  };
}

/** A Fetch that answers from the test, and records every URL it was asked for. */
export interface TestFetch extends Fetch {
  readonly requests: URL[];
}

/**
 * A Fetch whose answer to each request is `respond(url)`. A thrown error, or
 * a rejected promise, becomes a failed request.
 */
export function createTestFetch(respond: (url: URL) => unknown): TestFetch {
  const requests: URL[] = [];
  return {
    requests,
    async json(url) {
      const parsed = new URL(url);
      requests.push(parsed);
      return structuredClone(await respond(parsed));
    },
  };
}
