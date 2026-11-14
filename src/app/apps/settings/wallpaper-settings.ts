import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { Wallpaper } from '../../../core';
import { WebOSCore } from '../../webos-core';

/** Settings › Wallpaper: a preview of each Wallpaper to choose from. Applied as it is chosen. */
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
    /* A small Wallpaper: the same light and base, stronger so it shows at this size. */
    .preview {
      width: 100%;
      aspect-ratio: 16 / 10;
      border-radius: var(--radius-control);
      background:
        radial-gradient(90% 80% at 50% 0%, var(--wallpaper-light) 0%, transparent 100%),
        radial-gradient(90% 80% at 50% 0%, var(--wallpaper-light) 0%, transparent 100%),
        var(--wallpaper-base);
      box-shadow: inset 0 0 0 1px var(--material-border);
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
  `,
})
export class WallpaperSettings {
  protected readonly webos = inject(WebOSCore);

  protected choose(wallpaper: Wallpaper): void {
    this.webos.send((core) => core.wallpaper.choose(wallpaper));
  }
}
