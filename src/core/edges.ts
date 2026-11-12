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
}

/**
 * Fetches JSON over the network, for the Weather Widget. Rejects when the
 * request fails, times out, or doesn't succeed.
 */
export interface Fetch {
  json(url: string): Promise<unknown>;
}
