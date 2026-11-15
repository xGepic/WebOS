import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Ambient } from './ambient/ambient';
import { AmbientMode } from './ambient/ambient-mode';
import { Desktop } from './desktop/desktop';
import { Dock } from './dock/dock';
import { Toast } from './toast/toast';
import { WallpaperWeather } from './wallpaper-weather/wallpaper-weather';
import { MenuBar } from './menu-bar/menu-bar';
import { AppWindow } from './window/window';
import { WebOSCore } from './webos-core';

@Component({
  selector: 'webos-root',
  imports: [WallpaperWeather, MenuBar, Desktop, AppWindow, Dock, Toast, Ambient],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (webos.startupError(); as error) {
      <div class="startup-error material" role="alert">
        <h1>webOS couldn't start</h1>
        <p>{{ error }}</p>
        <p>Your data has been left untouched.</p>
      </div>
    } @else {
      <webos-wallpaper-weather />
      <div class="shell" [class.away]="ambient.on()">
        <webos-menu-bar />
        <webos-desktop />
        <webos-window />
        <webos-dock />
        <webos-toast />
      </div>
      <webos-ambient />
    }
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      height: 100%;
    }
    /*
     * Everything but the Wallpaper, its weather and the Ambient screen, which
     * Ambient mode fades. Its parts are all fixed, so it takes no room, and
     * fading them as one keeps their order while it fades.
     */
    .shell {
      transition: opacity 0.3s ease;
    }
    .shell.away {
      opacity: 0;
      transition-duration: 1.2s;
    }
    @media (prefers-reduced-motion: reduce) {
      .shell,
      .shell.away {
        transition-duration: 0.15s;
      }
    }
    .startup-error {
      max-width: 32rem;
      padding: 1.5rem 2rem;
      border-radius: var(--radius-widget);
      text-align: center;
    }
    .startup-error h1 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      letter-spacing: var(--tracking-title);
    }
  `,
})
export class App {
  protected readonly webos = inject(WebOSCore);
  protected readonly ambient = inject(AmbientMode);

  constructor() {
    // Paints the chosen Wallpaper, and keeps a copy where public/wallpaper.js finds it before
    // webOS starts, so the next new tab opens on it rather than flashing the default first.
    effect(() => {
      const wallpaper = this.webos.wallpaper();
      if (!wallpaper) return;
      document.documentElement.dataset['wallpaper'] = wallpaper;
      try {
        localStorage.setItem(WALLPAPER_KEY, wallpaper);
      } catch {
        // Without the copy, a new tab shows the default until webOS starts. Nothing else is lost.
      }
    });
  }
}

/** Where public/wallpaper.js reads the chosen Wallpaper. */
const WALLPAPER_KEY = 'webos-wallpaper';
