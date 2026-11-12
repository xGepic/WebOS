import { Injectable, effect, inject, signal } from '@angular/core';
import type { WidgetId } from '../../core';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/**
 * Whether the Desktop is in Edit Mode. UI-only state: it lives in the Angular
 * layer, not the core. The layout itself is saved by the core on every change,
 * so leaving Edit Mode has nothing left to save.
 */
@Injectable({ providedIn: 'root' })
export class DesktopEditor {
  private readonly webos = inject(WebOSCore);
  private readonly active = signal(false);
  private readonly message = signal<string | undefined>(undefined);

  /** Whether the Desktop is in Edit Mode. */
  readonly editing = this.active.asReadonly();
  /** Why the last change couldn't be made, for the Menu Bar to say. */
  readonly notice = this.message.asReadonly();

  constructor() {
    // Opening an App leaves Edit Mode: the Window covers the Desktop being edited.
    const window = inject(WindowState);
    effect(() => {
      if (window.app()) this.exit();
    });
  }

  enter(): void {
    this.message.set(undefined);
    this.active.set(true);
  }

  exit(): void {
    this.message.set(undefined);
    this.active.set(false);
  }

  /** Says why a change couldn't be made, or clears the last notice. */
  say(notice: string | undefined): void {
    this.message.set(notice);
  }

  /** Shows a hidden Widget, or says why there is no room for it. */
  async show(widget: WidgetId): Promise<void> {
    const shown = await this.webos.send((core) => core.desktop.show(widget));
    this.say(shown === false ? `No room for ${this.webos.widgetName(widget)}. Make some space first.` : undefined);
  }
}
