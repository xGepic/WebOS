import { apps } from './apps';
import * as desktop from './desktop';
import type { Clock, Storage } from './edges';
import { formatDate, formatTime } from './format';
import { greetingFor } from './greeting';
import { loadState, toCurrentDocument, type StateDocument } from './state';

export type { AppId } from './apps';
export type { PlacedWidget, Placement, Span, WidgetDefinition, WidgetId, WidgetSize } from './desktop';
export type { Clock, Storage } from './edges';
export { StateDocumentError } from './state';

export interface WebOSEdges {
  storage: Storage;
  clock: Clock;
}

export interface WebOS {
  /** Every App, in Dock order. */
  readonly apps: typeof apps;
  readonly profile: {
    /** The greeting for the current time of day, with the name if one is set: "Good morning, Stefan". */
    greeting(): string;
    /** The name as the user typed it; empty when not set. */
    name(): string;
    /** Sets the name the greeting uses, and saves it. */
    setName(name: string): Promise<void>;
  };
  readonly desktop: {
    /** The snap grid, in cells. */
    readonly grid: typeof desktop.grid;
    /** The Widget catalog: every Widget and the cells each size spans. */
    readonly widgets: typeof desktop.widgets;
    /** The Widgets on the Desktop and where they sit. */
    layout(): readonly desktop.PlacedWidget[];
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
  /** Stops the core's timers and its listening for other tabs' changes. */
  dispose(): void;
}

/**
 * Creates the webOS core. Rejects with a `StateDocumentError` if the stored
 * state can't be used, without touching it.
 */
export async function createWebOS({ storage, clock }: WebOSEdges): Promise<WebOS> {
  let state = await loadState(storage);
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const stopMinuteTicks = clock.onMinute(notify);

  /** Replaces the state, tells subscribers, and writes it to storage right away. */
  const commit = (next: StateDocument) => {
    state = next;
    notify();
    return storage.write(next);
  };

  // Another tab saved: adopt its document, so this tab never writes back a stale copy.
  // A document this build can't use is ignored rather than adopted.
  const stopExternalChanges = storage.onExternalChange((document) => {
    try {
      state = toCurrentDocument(document);
    } catch {
      return;
    }
    notify();
  });

  return {
    apps,
    profile: {
      name: () => state.profile.name,
      greeting: () => greetingFor(clock.now(), state.profile.name),
      setName: (name) => commit({ ...state, profile: { ...state.profile, name } }),
    },
    desktop: {
      grid: desktop.grid,
      widgets: desktop.widgets,
      layout: desktop.layout,
    },
    clock: {
      time: () => formatTime(clock.now()),
      date: () => formatDate(clock.now()),
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      stopMinuteTicks();
      stopExternalChanges();
    },
  };
}
