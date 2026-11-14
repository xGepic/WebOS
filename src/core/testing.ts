import type {
  BrowserLookup,
  CalendarAccount,
  CalendarServer,
  Clock,
  DisplayMonitor,
  DisplayReading,
  Fetch,
  FetchRequest,
  NetworkMonitor,
  NetworkReading,
  RemoteCalendar,
  Storage,
  SystemMonitor,
  SystemSample,
  VisitedPage,
} from './edges';

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

/** A BrowserLookup over the given history. */
export function createTestBrowser({ history = [] }: { history?: VisitedPage[] } = {}): BrowserLookup {
  return {
    recent: async (count) => structuredClone([...history].sort((a, b) => b.visitedAt - a.visitedAt).slice(0, count)),
  };
}

/** A Fetch that answers from the test, and records every URL it was asked for, and how. */
export interface TestFetch extends Fetch {
  readonly requests: URL[];
  /** How each request in `requests` was sent, in the same order. */
  readonly sent: FetchRequest[];
}

/**
 * A Fetch whose answer to each request is `respond(url, request)`. A thrown
 * error, or a rejected promise, becomes a failed request.
 */
export function createTestFetch(respond: (url: URL, request: FetchRequest) => unknown): TestFetch {
  const requests: URL[] = [];
  const sent: FetchRequest[] = [];
  return {
    requests,
    sent,
    async json(url, request = {}) {
      const parsed = new URL(url);
      requests.push(parsed);
      sent.push(structuredClone(request));
      return structuredClone(await respond(parsed, request));
    },
  };
}

/** A SystemMonitor whose readings the test sets; it rejects while `next` is an Error. */
export interface TestSystemMonitor extends SystemMonitor {
  next: SystemSample | Error;
}

export function createTestSystemMonitor(first: SystemSample | Error): TestSystemMonitor {
  const monitor: TestSystemMonitor = {
    next: first,
    async sample() {
      if (monitor.next instanceof Error) throw monitor.next;
      return { ...monitor.next };
    },
  };
  return monitor;
}

/** A CalendarServer serving what the test sets, and recording every request. */
export interface TestCalendarServer extends CalendarServer {
  /** The account's calendars. */
  calendarList: RemoteCalendar[];
  /** The iCalendar resources in each calendar, by its url. */
  resources: Record<string, string[]>;
  /** While set, every request rejects with it. */
  failure?: Error;
  readonly requests: { kind: 'calendars' | 'events'; account: CalendarAccount; url?: string; range?: { start: Date; end: Date } }[];
}

export function createTestCalendarServer(calendarList: RemoteCalendar[] = [], resources: Record<string, string[]> = {}): TestCalendarServer {
  const server: TestCalendarServer = {
    calendarList,
    resources,
    requests: [],
    async calendars(account) {
      server.requests.push({ kind: 'calendars', account: { ...account } });
      if (server.failure) throw server.failure;
      return structuredClone(server.calendarList);
    },
    async events(account, url, range) {
      server.requests.push({ kind: 'events', account: { ...account }, url, range });
      if (server.failure) throw server.failure;
      return [...(server.resources[url] ?? [])];
    },
  };
  return server;
}

/** A NetworkMonitor whose reading the test sets with `change`, which tells listeners. */
export interface TestNetworkMonitor extends NetworkMonitor {
  change(reading: NetworkReading): void;
}

export function createTestNetworkMonitor(first: NetworkReading): TestNetworkMonitor {
  let current = first;
  const listeners = new Set<() => void>();
  return {
    read: () => ({ ...current }),
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    change(reading) {
      current = reading;
      listeners.forEach((listener) => listener());
    },
  };
}

/** A DisplayMonitor listing what the test sets with `change`, which tells listeners. */
export interface TestDisplayMonitor extends DisplayMonitor {
  change(displays: DisplayReading[]): void;
}

export function createTestDisplayMonitor(first: DisplayReading[]): TestDisplayMonitor {
  let current = first;
  const listeners = new Set<() => void>();
  return {
    displays: async () => structuredClone(current),
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    change(displays) {
      current = displays;
      listeners.forEach((listener) => listener());
    },
  };
}
