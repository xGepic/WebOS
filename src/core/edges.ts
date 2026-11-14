/**
 * The edges the webOS core is created with. Production passes real browser
 * implementations; tests pass the ones from `./testing`.
 */

/**
 * Holds the single persisted state document. Several webOS tabs share it, so
 * it also reports documents that other tabs write.
 */
export interface Storage {
  /** Returns the stored document, or `undefined` if nothing has been stored yet. */
  read(): Promise<unknown>;
  write(document: unknown): Promise<void>;
  /**
   * Calls `listener` with the new document whenever another tab writes one.
   * Never called for this tab's own writes. Returns a function that stops it.
   */
  onExternalChange(listener: (document: unknown) => void): () => void;
}

/** The source of the current time. */
export interface Clock {
  now(): Date;
  /** Calls `listener` at the start of every minute. Returns a function that stops it. */
  onMinute(listener: () => void): () => void;
}

/** A page from the browser's history, with when it was last visited (epoch milliseconds). */
export interface VisitedPage {
  title: string;
  url: string;
  visitedAt: number;
}

/** Looks up the browser's history, for the Recent Widget. */
export interface BrowserLookup {
  /** The `count` pages visited last, latest first. */
  recent(count: number): Promise<VisitedPage[]>;
}

/** How a request is sent; a plain GET without one. */
export interface FetchRequest {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  /** A JSON body, for a POST. */
  body?: unknown;
}

/** A request the server answered without success, with the HTTP status it gave. */
export class FetchError extends Error {
  override readonly name = 'FetchError';
  constructor(
    readonly status: number,
    message = `The request failed with status ${status}.`,
  ) {
    super(message);
  }
}

/**
 * Fetches JSON over the network, for the Weather Widget. Rejects
 * when the request fails or times out, and with a `FetchError` when the
 * server answers without success.
 */
export interface Fetch {
  json(url: string, request?: FetchRequest): Promise<unknown>;
}

/** One reading of the machine's processors and memory, for the System Widget. */
export interface SystemSample {
  /** Processor time since the machine started, summed over every core, in any unit. */
  cpuTotal: number;
  /** How much of that was idle, in the same unit. */
  cpuIdle: number;
  /** The number of logical processors. */
  cores: number;
  /** Bytes. */
  memoryCapacity: number;
  memoryAvailable: number;
  /** The processor's name as the system gives it, e.g. "Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz". */
  cpuModel?: string;
}

/** Reads the machine's processors and memory. Rejects when it can't. */
export interface SystemMonitor {
  sample(): Promise<SystemSample>;
}

/** The network connection as the browser sees it. */
export interface NetworkReading {
  online: boolean;
  /** The browser's estimate of the bandwidth, in megabits per second, if it gives one. Chromium caps it at 10. */
  downlinkMbps?: number;
  /** The browser's estimate of the round-trip time, in milliseconds, if it gives one. */
  rttMs?: number;
}

/** Watches the network connection, for the System Widget. */
export interface NetworkMonitor {
  read(): NetworkReading;
  /** Calls `listener` whenever the reading may have changed. Returns a function that stops it. */
  onChange(listener: () => void): () => void;
}

/** One display attached to the machine. */
export interface DisplayReading {
  name: string;
  /** In physical pixels. */
  width: number;
  height: number;
  /** The scaling, e.g. 1.5 for 150%. */
  scale: number;
  primary: boolean;
  /** In hertz, if known. */
  refreshRate?: number;
}

/** Lists the displays, for the System Widget. */
export interface DisplayMonitor {
  /** Rejects when they can't be read. */
  displays(): Promise<DisplayReading[]>;
  /** Calls `listener` whenever a display is added, removed or changed. Returns a function that stops it. */
  onChange(listener: () => void): () => void;
}

/** An Apple ID and app-specific password, as the CalendarServer signs in with them. */
export interface CalendarAccount {
  appleId: string;
  password: string;
}

/** One of an account's event calendars. */
export interface RemoteCalendar {
  /** Its address on the server, which `events` takes. */
  url: string;
  name: string;
  /** A CSS colour, if the server gives one. */
  color?: string;
}

/**
 * The user's calendars on iCloud, read-only, for Apple Calendar. Rejects when
 * a request fails, and with a `FetchError` with status 401 when Apple refuses
 * the sign-in.
 */
export interface CalendarServer {
  /** Signs in and lists the account's event calendars. */
  calendars(account: CalendarAccount): Promise<RemoteCalendar[]>;
  /** The iCalendar text of each event resource in the calendar at `calendarUrl` with an occurrence overlapping `start`–`end`. */
  events(account: CalendarAccount, calendarUrl: string, range: { start: Date; end: Date }): Promise<string[]>;
}
