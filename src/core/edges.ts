/**
 * The edges the webOS core is created with. Production passes real browser
 * implementations; tests pass the ones from `./testing`.
 */

/** Holds the single persisted state document. */
export interface Storage {
  /** Returns the stored document, or `undefined` if nothing has been stored yet. */
  read(): Promise<unknown>;
  write(document: unknown): Promise<void>;
}

/** The source of the current time. */
export interface Clock {
  now(): Date;
  /** Calls `listener` at the start of every minute. Returns a function that stops it. */
  onMinute(listener: () => void): () => void;
}
