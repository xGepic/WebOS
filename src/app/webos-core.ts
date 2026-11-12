import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { createWebOS, type AppId, type Cell, type WebOS, type WidgetId, type WidgetSize } from '../core';
import { createExtensionStorage } from '../edges/extension-storage';
import { createSystemClock } from '../edges/system-clock';

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
  readonly linkGroups = this.read((core) => core.links.groups());
  readonly dockedLinks = this.read((core) => core.links.docked());
  readonly openTodos = this.read((core) => core.todos.open());
  readonly completedTodos = this.read((core) => core.todos.completed());
  readonly notes = this.read((core) => core.notes.list());
  readonly selectedNote = this.read((core) => core.notes.selected());
  readonly widgetNote = this.read((core) => core.notes.forWidget());
  readonly devUtilitiesTab = this.read((core) => core.devUtilities.activeTab());
  /** The Dev Utilities conversions. They are pure, so views call them directly. */
  readonly devUtilities = this.read((core) => core.devUtilities);
  readonly time = this.read((core) => core.clock.time());
  readonly date = this.read((core) => core.clock.date());

  /** Creates the core. Called once by the app initializer before the first render. */
  async start(): Promise<void> {
    try {
      const core = await createWebOS({
        storage: createExtensionStorage(),
        clock: createSystemClock(),
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

  /** Where a Widget of `size` with its top-left at `cell` would sit on the grid, as a move would place it. */
  fitOnGrid(widget: WidgetId, size: WidgetSize, cell: Cell): Cell | undefined {
    return this.core()?.desktop.fitOnGrid(widget, size, cell);
  }

  /** The display name of a Widget, e.g. "Todos". */
  widgetName(widget: WidgetId): string {
    return this.core()?.desktop.widgets[widget].name ?? '';
  }

  private read<T>(selector: (core: WebOS) => T) {
    return computed(() => {
      this.changes();
      const core = this.core();
      return core ? selector(core) : undefined;
    });
  }
}
