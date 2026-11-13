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
  private readonly origins = new Map<AppId, HTMLElement>();

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

  /**
   * Where the Window opens out of for an App and closes back into: its Dock
   * icon, or for Notes the Notes Widget. Without one, the Window just fades.
   */
  registerOrigin(app: AppId, element: HTMLElement): void {
    this.origins.set(app, element);
  }

  /** Forgets `element` as the App's origin, if it still is, e.g. when its Widget leaves the Desktop. */
  unregisterOrigin(app: AppId, element: HTMLElement): void {
    if (this.origins.get(app) === element) this.origins.delete(app);
  }

  originFor(app: AppId): HTMLElement | undefined {
    return this.origins.get(app);
  }
}
