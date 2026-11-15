import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { WebOSCore } from '../webos-core';

/** How often webOS checks whether the Desktop has been left alone long enough. */
const CHECK_EVERY_MS = 5_000;
const MINUTE_MS = 60_000;

/**
 * Ambient mode: whether the Desktop has been left alone for the minutes chosen
 * in Settings, so the Ambient screen shows over the Wallpaper. UI-only and per
 * tab. Any key, click, scroll or move of the pointer ends it; the key, click or
 * scroll that ends it does nothing else, so waking webOS never presses a button
 * or types into a field. Coming back to the tab ends it too, and a hidden tab
 * never starts it.
 */
@Injectable({ providedIn: 'root' })
export class AmbientMode {
  private readonly webos = inject(WebOSCore);
  private readonly shown = signal(false);
  /** Whether the Ambient screen shows. */
  readonly on = this.shown.asReadonly();

  private lastActive = Date.now();
  /** Set when a press ends Ambient mode, so its release and click are swallowed too. */
  private swallowingPress = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const active = () => {
      this.lastActive = Date.now();
      this.shown.set(false);
    };
    const swallowIfOn = (event: Event) => {
      if (this.shown()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.type === 'pointerdown') this.swallowingPress = true;
      } else if (event.type === 'pointerdown') {
        // A press that ended Ambient mode but never clicked, such as a drag, stops being swallowed.
        this.swallowingPress = false;
      }
      active();
    };
    const endOfPress = (event: Event) => {
      if (!this.swallowingPress) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type === 'click') this.swallowingPress = false;
    };
    const visibility = () => active();
    const listeners: [EventTarget, string, EventListener, AddEventListenerOptions][] = [
      [window, 'pointermove', active, { capture: true, passive: true }],
      [window, 'keydown', swallowIfOn, { capture: true }],
      [window, 'pointerdown', swallowIfOn, { capture: true }],
      [window, 'wheel', swallowIfOn, { capture: true, passive: false }],
      [window, 'pointerup', endOfPress, { capture: true }],
      [window, 'click', endOfPress, { capture: true }],
      [document, 'visibilitychange', visibility, {}],
    ];
    for (const [target, type, listener, options] of listeners) target.addEventListener(type, listener, options);

    const timer = setInterval(() => {
      const after = this.webos.ambientAfter();
      if (after == null || document.hidden || this.shown()) return;
      if (Date.now() - this.lastActive >= after * MINUTE_MS) this.shown.set(true);
    }, CHECK_EVERY_MS);

    destroyRef.onDestroy(() => {
      clearInterval(timer);
      for (const [target, type, listener, options] of listeners) target.removeEventListener(type, listener, options);
    });
  }
}
