import { createActivity, type ActivityApi } from './activity/api';
import { createClipboard, type ClipboardApi } from './clipboard/api';
import { createDesktop, type DesktopApi } from './desktop/api';
import { normalizeLayout } from './desktop/desktop';
import { createDevUtilities, type DevUtilitiesApi } from './dev-utilities/api';
import type { BrowserLookup, CalendarServer, Clock, Fetch, NetworkMonitor, Storage, SystemMonitor } from './edges';
import { createOrganizer, type OrganizerApi } from './organizer/api';
import { clearCompleted } from './organizer/todos';
import { createSky, type SkyApi } from './sky/api';
import { createBackup, type BackupApi } from './state/api';
import { loadState, toCurrentDocument, type StateDocument } from './state/state';
import type { Store } from './store';
import { createTime, type TimeApi } from './time/api';
import { clearPassed } from './time/countdown';

export type { AppId } from './desktop/apps';
export type { Cell, LayoutEntry, PlacedWidget, Placement, Span, WidgetDefinition, WidgetId, WidgetSize } from './desktop/desktop';
export type { Wallpaper } from './desktop/wallpaper';
export type {
  BrowserLookup,
  CalendarAccount,
  CalendarServer,
  Clock,
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
export { FetchError } from './edges';
export type { Countdown, CountdownInput, CountdownView } from './time/countdown';
export type { WorldClockCity, WorldClockView } from './time/world-clock';
export { MAX_WORLD_CLOCKS } from './time/world-clock';
export type { MoonEvent, MoonPhase, MoonView } from './sky/moon';
export type { SunView } from './sky/sun';
export type { RecentPage } from './activity/recent';
export type { SystemPart, SystemPartChoice, SystemView, UsageView } from './activity/system';
export { CPU_HISTORY } from './activity/system';
export type { CalendarDay, CalendarDayDetails, CalendarMonth, CalendarWeek } from './time/calendar';
export type { AppleCalendarChoice, AppleCalendarProblem, AppleCalendarStatus, CalendarDayView, DayEvent } from './time/apple-calendar';
export type { ForecastDayView, WeatherCity, WeatherCondition, WeatherView } from './sky/weather';
export { describeCity } from './sky/weather';
export type { Base64Result } from './dev-utilities/base64';
export type { DevUtilitiesTab } from './dev-utilities/dev-utilities';
export type { DiffPart, DiffResult, DiffRow } from './dev-utilities/diff';
export type { JsonError, JsonResult } from './dev-utilities/json';
export { webSearchUrl } from './search/web-search';
export type { BackupFile } from './state/backup';
export type { ListedNote, Note } from './organizer/notes';
export type { TimestampResult } from './dev-utilities/timestamp';
export type { Todo } from './organizer/todos';
export type { ClipKind, ListedClip, SaveResult } from './clipboard/clips';
export { StateDocumentError } from './state/state';

export interface WebOSEdges {
  storage: Storage;
  clock: Clock;
  /** The browser's history, for the Recent Widget. Without it, the Widget lists no pages. */
  browser?: BrowserLookup;
  /** The network, for the Weather Widget. Without it, nothing is fetched. */
  fetch?: Fetch;
  /** The machine's processors and memory, for the System Widget. Without it, the Widget says they are unavailable. */
  system?: SystemMonitor;
  /** iCloud's calendars, for Apple Calendar. Without it, nothing is synced. */
  calendars?: CalendarServer;
  /** The network connection, for the System Widget. Without it, the Widget shows no network. */
  network?: NetworkMonitor;
}

/** The webOS core: everything the Angular layer reads and every command it sends. Each area's part is documented in its `api.ts`. */
export interface WebOS extends DesktopApi, OrganizerApi, ClipboardApi, DevUtilitiesApi, BackupApi, TimeApi, SkyApi, ActivityApi {
  /**
   * Calls `listener` whenever anything readable from the core may have changed,
   * including the time at the start of every minute. Returns an unsubscribe function.
   */
  subscribe(listener: () => void): () => void;
  /** Stops the core's timers and its listening for other tabs' changes. */
  dispose(): void;
}

/**
 * Creates the webOS core, as the Desktop loads. Completed Todos that are due
 * to be cleared, and Countdowns whose day has passed, are cleared now. Rejects
 * with a `StateDocumentError` if the stored state can't be used, without
 * touching it.
 */
export async function createWebOS({ storage, clock, browser, fetch, system, calendars, network }: WebOSEdges): Promise<WebOS> {
  /** A document with its layout made safe to use; see `desktop.normalizeLayout`. */
  const withSafeLayout = (document: StateDocument): StateDocument => ({ ...document, layout: normalizeLayout(document.layout) });
  let state = withSafeLayout(await loadState(storage));
  const listeners = new Set<() => void>();
  const adoptListeners = new Set<(state: StateDocument, how: { imported: boolean }) => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const stopMinuteTicks = clock.onMinute(notify);

  /** Takes `next` as the state, lets each area follow it, and tells subscribers. */
  const adopt = (next: StateDocument, imported = false) => {
    state = next;
    adoptListeners.forEach((listener) => listener(state, { imported }));
    notify();
  };

  const store: Store = {
    clock,
    state: () => state,
    commit(next) {
      adopt(next);
      return storage.write(next);
    },
    async replace(next) {
      const safe = withSafeLayout(next);
      await storage.write(safe);
      adopt(safe, true);
    },
    notify,
    onAdopt: (listener) => adoptListeners.add(listener),
  };

  // The Desktop is loading: clear Todos completed 3 or more days ago, and Countdowns whose
  // day has passed, and save that.
  const remaining = clearCompleted(state.todos, clock.now().getTime());
  const comingUp = clearPassed(state.countdowns, clock.now());
  if (remaining.length !== state.todos.length || comingUp.length !== state.countdowns.length) {
    await store.commit({ ...state, todos: remaining, countdowns: comingUp });
  }

  // Another tab saved: adopt its document, so this tab never writes back a stale copy.
  // A document this build can't use is ignored rather than adopted.
  const stopExternalChanges = storage.onExternalChange((document) => {
    let next: StateDocument;
    try {
      next = toCurrentDocument(document);
    } catch {
      return;
    }
    adopt(withSafeLayout(next));
  });

  return {
    ...createDesktop(store),
    ...createOrganizer(store),
    ...createClipboard(store),
    ...createDevUtilities(store),
    ...createBackup(store),
    ...createTime(store, calendars),
    ...createSky(store, fetch),
    ...createActivity(store, { browser, system, network }),
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
