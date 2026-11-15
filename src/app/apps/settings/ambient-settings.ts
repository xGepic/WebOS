import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { AmbientAfter } from '../../../core';
import { WebOSCore } from '../../webos-core';

/** Settings › Ambient mode: after how many minutes alone the Desktop goes to Ambient mode, or never. Applied as it is chosen. */
@Component({
  selector: 'webos-ambient-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="settings-ambient">
      <h3 id="settings-ambient" class="section-heading">Ambient mode</h3>
      <div class="segmented" role="group" aria-label="Start Ambient mode after">
        <button type="button" class="button" [attr.aria-pressed]="webos.ambientAfter() === null" (click)="choose(null)">Off</button>
        @for (minutes of webos.ambientChoices(); track minutes) {
          <button type="button" class="button" [attr.aria-pressed]="webos.ambientAfter() === minutes" (click)="choose(minutes)">
            {{ minutes }} min
          </button>
        }
      </div>
      <p class="hint">
        After this long without a key, click or move of the pointer, the Desktop fades to a large clock over the
        Wallpaper. Anything you do brings it back, and does nothing else.
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
    .hint {
      margin-top: 0.5rem;
    }
  `,
})
export class AmbientSettings {
  protected readonly webos = inject(WebOSCore);

  protected choose(minutes: AmbientAfter | null): void {
    this.webos.send((core) => core.ambient.setAfter(minutes));
  }
}
