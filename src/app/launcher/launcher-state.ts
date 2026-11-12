import { Injectable, signal } from '@angular/core';

/**
 * Whether the Launcher is open, and what is typed into it. UI-only state: it
 * lives in the Angular layer, not the core.
 */
@Injectable({ providedIn: 'root' })
export class LauncherState {
  private readonly shown = signal(false);
  private readonly typed = signal('');

  /** Whether the Launcher is open. */
  readonly isOpen = this.shown.asReadonly();
  /** What is typed into the Launcher. */
  readonly query = this.typed.asReadonly();

  /** Opens the Launcher with `query` typed in (empty by default). */
  open(query = ''): void {
    this.typed.set(query);
    this.shown.set(true);
  }

  setQuery(query: string): void {
    this.typed.set(query);
  }

  close(): void {
    this.shown.set(false);
  }
}
