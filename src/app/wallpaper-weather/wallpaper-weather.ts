import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import type { WallpaperWeather as Weather } from '../../core';
import { WebOSCore } from '../webos-core';

/**
 * Wallpaper Weather: rain, snow or fog drawn faintly on the Wallpaper while
 * the Weather city has it. A fixed layer behind the Desktop, above the
 * Wallpaper's light and under its grain; CSS animations of `transform` only,
 * so the compositor runs them and the browser stops them in hidden tabs. It
 * fades in and out, keeping the last weather drawn while it fades out.
 *
 * It is always on the page, so it also asks for the weather whenever the tab
 * is shown again: a tab kept open all day keeps up, the Weather Widget with it.
 */
@Component({
  selector: 'webos-wallpaper-weather',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[attr.data-weather]': 'drawn()',
    '[class.on]': 'webos.wallpaperWeather()',
    '(document:visibilitychange)': 'refreshWhenShown()',
  },
  template: `
    <div class="drift">
      <div class="layer far"></div>
      <div class="layer near"></div>
    </div>
  `,
  styleUrl: './wallpaper-weather.css',
})
export class WallpaperWeather {
  protected readonly webos = inject(WebOSCore);

  /** The weather now, or the last weather while it fades out. */
  protected readonly drawn = linkedSignal<Weather | null | undefined, Weather | null>({
    source: () => this.webos.wallpaperWeather(),
    computation: (now, previous) => now ?? previous?.value ?? null,
  });

  protected refreshWhenShown(): void {
    if (document.visibilityState === 'visible') this.webos.send((core) => core.weather.refresh());
  }
}
