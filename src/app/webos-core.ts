import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { createWebOS, type WebOS } from '../core';
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
  readonly greeting = this.read((core) => core.profile.greeting());
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

  private read<T>(selector: (core: WebOS) => T) {
    return computed(() => {
      this.changes();
      const core = this.core();
      return core ? selector(core) : undefined;
    });
  }
}
