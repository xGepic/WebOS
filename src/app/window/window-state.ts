import { Injectable, signal } from '@angular/core';
import type { AppId } from '../../core';

/**
 * Which App is open in the Window. UI-only state: it lives in the Angular
 * layer, not the core. Only one Window exists, so opening an App replaces
 * whatever was open.
 */
@Injectable({ providedIn: 'root' })
export class WindowState {
  private readonly openApp = signal<AppId | undefined>(undefined);
  private readonly dockIcons = new Map<AppId, HTMLElement>();

  /** The App open in the Window, if any. */
  readonly app = this.openApp.asReadonly();

  open(app: AppId): void {
    this.openApp.set(app);
  }

  close(): void {
    this.openApp.set(undefined);
  }

  /** Opens the App, or closes the Window if that App is the one already open (its Dock icon clicked again). */
  toggle(app: AppId): void {
    if (this.openApp() === app) this.close();
    else this.open(app);
  }

  /** The Dock registers each App's icon, so the Window can open out of it and close back into it. */
  registerDockIcon(app: AppId, icon: HTMLElement): void {
    this.dockIcons.set(app, icon);
  }

  dockIconFor(app: AppId): HTMLElement | undefined {
    return this.dockIcons.get(app);
  }
}
