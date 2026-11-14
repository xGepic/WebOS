import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import {
  createWebOS,
  type AppId,
  type BackupFile,
  type CalendarDayDetails,
  type CalendarDayView,
  type CalendarMonth,
  type Cell,
  type WeatherCity,
  type WebOS,
  type WidgetId,
  type WidgetSize,
} from '../core';
import { createBrowserLookup } from '../edges/browser-lookup';
import { createExtensionStorage } from '../edges/extension-storage';
import { createICloudCalendar, releaseICloudAccess, requestICloudAccess } from '../edges/icloud-calendar';
import { createNetworkFetch } from '../edges/network';
import { createNetworkMonitor } from '../edges/network-status';
import { createSystemClock } from '../edges/system-clock';
import { createSystemMonitor } from '../edges/system-monitor';

/**
 * Holds the webOS core for the Angular layer and exposes its read-only state
 * as signals. Components read these signals and send commands to the core.
 */
@Injectable({ providedIn: 'root' })
export class WebOSCore {
  private readonly destroyRef = inject(DestroyRef);
  private readonly core = signal<WebOS | undefined>(undefined);
  /** Bumped whenever the core reports a change, so the computeds below re-read it. */
  private readonly changes = signal(0);

  /** Why the core couldn't start, if it couldn't. */
  readonly startupError = signal<string | undefined>(undefined);

  readonly apps = this.read((core) => core.apps);
  readonly grid = this.read((core) => core.desktop.grid);
  readonly layout = this.read((core) => core.desktop.layout());
  readonly hiddenWidgets = this.read((core) => core.desktop.hidden());
  readonly name = this.read((core) => core.profile.name());
  readonly greeting = this.read((core) => core.profile.greeting());
  readonly openTodos = this.read((core) => core.todos.open());
  readonly completedTodos = this.read((core) => core.todos.completed());
  readonly notes = this.read((core) => core.notes.list());
  readonly selectedNote = this.read((core) => core.notes.selected());
  readonly clips = this.read((core) => core.clips.list());
  readonly devUtilitiesTab = this.read((core) => core.devUtilities.activeTab());
  /** The Dev Utilities conversions. They are pure, so views call them directly. */
  readonly devUtilities = this.read((core) => core.devUtilities);
  readonly time = this.read((core) => core.clock.time());
  readonly date = this.read((core) => core.clock.date());
  readonly weather = this.read((core) => core.weather.view());
  readonly weatherCity = this.read((core) => core.weather.city());
  readonly appleCalendar = this.read((core) => core.appleCalendar.status());
  readonly countdowns = this.read((core) => core.countdowns.list());
  readonly upcomingCountdowns = this.read((core) => core.countdowns.upcoming());
  readonly worldClock = this.read((core) => core.worldClock.view());
  readonly moon = this.read((core) => core.moon.view());
  readonly sun = this.read((core) => core.sun.view());
  readonly recentPages = this.read((core) => core.recent.pages());
  readonly system = this.read((core) => core.system.view());
  readonly systemParts = this.read((core) => core.system.parts());
  readonly wallpaper = this.read((core) => core.wallpaper.current());
  readonly wallpapers = this.read((core) => core.wallpaper.choices);

  /** Creates the core. Called once by the app initializer before the first render. */
  async start(): Promise<void> {
    try {
      const core = await createWebOS({
        storage: createExtensionStorage(),
        clock: createSystemClock(),
        browser: createBrowserLookup(),
        fetch: createNetworkFetch(),
        system: createSystemMonitor(),
        calendars: createICloudCalendar(),
        network: createNetworkMonitor(),
      });
      const unsubscribe = core.subscribe(() => this.changes.update((n) => n + 1));
      this.destroyRef.onDestroy(() => {
        unsubscribe();
        core.dispose();
      });
      this.core.set(core);
    } catch (error) {
      console.error(error);
      this.startupError.set(error instanceof Error ? error.message : String(error));
    }
  }

  /** The display name of an App, e.g. "Dev Utilities". */
  appName(app: AppId): string {
    return this.apps()?.find((candidate) => candidate.id === app)?.name ?? '';
  }

  /**
   * Sends a command to the core. The change shows at once; if saving it fails,
   * the failure is logged. Resolves to the command's result, or undefined if it failed.
   */
  send<T>(command: (core: WebOS) => Promise<T>): Promise<T | undefined> {
    const core = this.core();
    if (!core) return Promise.resolve(undefined);
    return command(core).catch((error) => {
      console.error('webOS could not save a change', error);
      return undefined;
    });
  }

  /**
   * The Calendar's calendar arithmetic. Called inside a computed, the results
   * follow the day as it changes, like the signals above.
   */
  readonly calendar = {
    month: (offset: number): CalendarMonth | undefined => this.withCore((core) => core.calendar.month(offset)),
    describe: (date: string): CalendarDayDetails | undefined => this.withCore((core) => core.calendar.describe(date)),
    day: (date: string): CalendarDayView | undefined => this.withCore((core) => core.calendar.day(date)),
    today: (): string | undefined => this.withCore((core) => core.calendar.today()),
    offsetOf: (date: string): number => this.withCore((core) => core.calendar.offsetOf(date)) ?? 0,
    addDays: (date: string, days: number): string => this.withCore((core) => core.calendar.addDays(date, days)) ?? date,
    addMonths: (date: string, months: number): string => this.withCore((core) => core.calendar.addMonths(date, months)) ?? date,
  };

  /**
   * Asks the browser to let webOS reach iCloud, for Settings › Apple Calendar.
   * Call it straight from the Connect click. Resolves to whether access was given.
   */
  allowICloud(): Promise<boolean> {
    return requestICloudAccess().catch((error) => {
      console.error('webOS could not ask for access to iCloud', error);
      return false;
    });
  }

  /** Gives up access to iCloud, after disconnecting Apple Calendar. */
  releaseICloud(): void {
    releaseICloudAccess().catch((error) => console.error('webOS could not give up access to iCloud', error));
  }

  /** Up to five cities matching `query`, for Settings. Rejects if the search can't be made. */
  searchCities(query: string): Promise<WeatherCity[]> {
    return this.core()?.weather.searchCities(query) ?? Promise.resolve([]);
  }

  /** A backup file of all webOS data, or undefined before the core has started. */
  exportBackup(): BackupFile | undefined {
    return this.core()?.backup.export();
  }

  /**
   * Replaces all webOS data with a backup file's. Unlike `send`, it rejects
   * when the import fails, so the caller can say why: with a
   * `StateDocumentError` when the file can't be used, and nothing has changed.
   */
  async importBackup(text: string): Promise<void> {
    const core = this.core();
    if (!core) throw new Error('webOS has not started.');
    await core.backup.import(text);
  }

  /** Where a Widget of `size` with its top-left at `cell` would sit on the grid, as a move would place it. */
  fitOnGrid(widget: WidgetId, size: WidgetSize, cell: Cell): Cell | undefined {
    return this.core()?.desktop.fitOnGrid(widget, size, cell);
  }

  /** The display name of a Widget, e.g. "Todos". */
  widgetName(widget: WidgetId): string {
    return this.core()?.desktop.widgets[widget].name ?? '';
  }

  /** Reads from the core now, registering the read with any computed or effect that runs it. */
  private withCore<T>(selector: (core: WebOS) => T): T | undefined {
    this.changes();
    const core = this.core();
    return core ? selector(core) : undefined;
  }

  private read<T>(selector: (core: WebOS) => T) {
    return computed(() => {
      this.changes();
      const core = this.core();
      return core ? selector(core) : undefined;
    });
  }
}
