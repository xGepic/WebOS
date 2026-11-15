import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { Wallpaper } from '../../../core';
import { WebOSCore } from '../../webos-core';

/** Settings › Wallpaper: a preview of each Wallpaper to choose from, and whether it shows the weather. Applied as they are chosen. */
@Component({
  selector: 'webos-wallpaper-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="settings-wallpaper">
      <h3 id="settings-wallpaper" class="section-heading">Wallpaper</h3>
      <fieldset>
        <legend class="visually-hidden">Wallpaper</legend>
        <div class="choices">
          @for (wallpaper of webos.wallpapers(); track wallpaper.id) {
            <label class="choice">
              <input
                type="radio"
                name="wallpaper"
                class="visually-hidden"
                [value]="wallpaper.id"
                [checked]="wallpaper.id === webos.wallpaper()"
                (change)="choose(wallpaper.id)"
              />
              <span class="preview" [attr.data-wallpaper]="wallpaper.id" aria-hidden="true"></span>
              {{ wallpaper.name }}
            </label>
          }
        </div>
      </fieldset>
      <label class="weather">
        <input type="checkbox" class="checkbox" [checked]="webos.showsWallpaperWeather()" (change)="setShowsWeather($event)" />
        Show the weather
      </label>
      <p class="hint">
        Faint rain, snow or fog on the Wallpaper while your Weather city has it. Rain and snow stay off while
        reduced motion is on.
      </p>
    </section>
  `,
  styles: `
    section {
      max-width: 26rem;
    }
    .section-heading {
      margin-bottom: 1rem;
    }
    fieldset {
      margin: 0;
      padding: 0;
      border: 0;
    }
    .choices {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(4.25rem, 1fr));
      gap: 0.75rem;
    }
    .choice {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .choice:has(:checked) {
      color: var(--text-primary);
      font-weight: 600;
    }
    /* A small Wallpaper: the same light and base, stronger so it shows at this size, and a dot of its accent. */
    .preview {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 10;
      border-radius: var(--radius-control);
      background:
        radial-gradient(90% 80% at 50% 0%, var(--wallpaper-light) 0%, transparent 100%),
        radial-gradient(90% 80% at 50% 0%, var(--wallpaper-light) 0%, transparent 100%),
        var(--wallpaper-base);
      box-shadow: inset 0 0 0 1px var(--material-border);
    }
    .preview::after {
      content: '';
      position: absolute;
      right: 0.375rem;
      bottom: 0.375rem;
      width: 0.5rem;
      height: 0.5rem;
      border-radius: var(--radius-pill);
      background: var(--accent);
    }
    .choice:hover .preview {
      box-shadow: inset 0 0 0 1px var(--text-secondary);
    }
    .choice:has(:checked) .preview {
      box-shadow:
        inset 0 0 0 1px var(--material-border),
        0 0 0 2px var(--accent);
    }
    .choice:has(:focus-visible) .preview {
      outline: 2px solid var(--focus-ring);
      outline-offset: 3px;
    }
    .weather {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-top: 1.25rem;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .hint {
      margin-top: 0.375rem;
    }
  `,
})
export class WallpaperSettings {
  protected readonly webos = inject(WebOSCore);

  protected choose(wallpaper: Wallpaper): void {
    this.webos.send((core) => core.wallpaper.choose(wallpaper));
  }

  protected setShowsWeather(event: Event): void {
    const shown = (event.target as HTMLInputElement).checked;
    this.webos.send((core) => core.wallpaper.setShowsWeather(shown));
  }
}
