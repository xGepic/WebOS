import type { Clock, Storage } from './edges';
import { formatDate, formatTime } from './format';
import { greetingFor } from './greeting';
import { loadState } from './state';

export type { Clock, Storage } from './edges';
export { StateDocumentError } from './state';

export interface WebOSEdges {
  storage: Storage;
  clock: Clock;
}

export interface WebOS {
  readonly profile: {
    /** The greeting for the current time of day, e.g. "Good morning". */
    greeting(): string;
  };
  readonly clock: {
    /** The current time in 12-hour format, e.g. "9:05 AM". */
    time(): string;
    /** Today's date, e.g. "Thursday, November 12". */
    date(): string;
  };
  /**
   * Calls `listener` whenever anything readable from the core may have changed,
   * including the time at the start of every minute. Returns an unsubscribe function.
   */
  subscribe(listener: () => void): () => void;
  /** Stops the core's timers. */
  dispose(): void;
}

/**
 * Creates the webOS core. Rejects with a `StateDocumentError` if the stored
 * state can't be used, without touching it.
 */
export async function createWebOS({ storage, clock }: WebOSEdges): Promise<WebOS> {
  await loadState(storage);
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const stopMinuteTicks = clock.onMinute(notify);

  return {
    profile: {
      greeting: () => greetingFor(clock.now()),
    },
    clock: {
      time: () => formatTime(clock.now()),
      date: () => formatDate(clock.now()),
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose: stopMinuteTicks,
  };
}
