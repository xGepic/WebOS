import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** How long a toast stays. */
const TOAST_MS = 1800;

/** A brief confirmation, such as "UUID copied". UI-only state. */
@Injectable({ providedIn: 'root' })
export class Toasts {
  private readonly current = signal<{ message: string } | undefined>(undefined);
  private timer: ReturnType<typeof setTimeout> | undefined;

  /** The toast on screen, if any. A new object per toast, so the same message shown twice appears twice. */
  readonly toast = this.current.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  show(message: string): void {
    this.current.set({ message });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.current.set(undefined), TOAST_MS);
  }
}
