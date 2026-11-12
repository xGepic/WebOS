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

/** A page the browser knows, from its bookmarks or history. */
export interface BrowserPage {
  title: string;
  url: string;
}

/** A page from the browser's history, with when it was last visited (epoch milliseconds). */
export interface VisitedPage extends BrowserPage {
  visitedAt: number;
}

/**
 * Looks up the browser's bookmarks and history for the Launcher. Like the
 * browser, it finds pages whose title or URL contains what was typed.
 */
export interface BrowserLookup {
  bookmarks(query: string): Promise<BrowserPage[]>;
  history(query: string): Promise<VisitedPage[]>;
  /** The `count` pages visited last, latest first, for the Recent Widget. */
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
 * Fetches JSON over the network, for the Weather and GitHub Widgets. Rejects
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
}

/** Reads the machine's processors and memory. Rejects when it can't. */
export interface SystemMonitor {
  sample(): Promise<SystemSample>;
}
