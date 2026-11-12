import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** How long a request waits for the Todos Widget to appear before it is dropped. */
const REQUEST_MS = 1000;

/**
 * Which Todo the Todos Widget should bring into view and highlight, as the
 * Launcher asks when a Todo is chosen. UI-only state. The Widget takes the
 * request once it is on screen, which may be a moment later if it was hidden;
 * a request it doesn't take soon is dropped, so it can't surprise later.
 */
@Injectable({ providedIn: 'root' })
export class TodoHighlight {
  /** A new object per request, so asking for the same Todo again highlights it again. */
  private readonly pending = signal<{ todoId: string } | undefined>(undefined);
  private timer: ReturnType<typeof setTimeout> | undefined;

  /** The Todo waiting to be highlighted, if any. */
  readonly request = this.pending.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  highlight(todoId: string): void {
    this.pending.set({ todoId });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.done(), REQUEST_MS);
  }

  /** The Widget has highlighted it, or it waited too long. */
  done(): void {
    clearTimeout(this.timer);
    this.pending.set(undefined);
  }
}
