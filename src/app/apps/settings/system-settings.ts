import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { SystemPart } from '../../../core';
import { WebOSCore } from '../../webos-core';

/** Settings › System: which parts the System Widget shows. Saved as they are ticked. */
@Component({
  selector: 'webos-system-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="settings-system">
      <h3 id="settings-system" class="section-heading">System</h3>
      <fieldset>
        <legend>Show in the System Widget</legend>
        @for (choice of webos.systemParts(); track choice.part) {
          <label class="part">
            <input type="checkbox" class="checkbox" [checked]="choice.shown" (change)="setShown(choice.part, $event)" />
            {{ choice.name }}
          </label>
        }
      </fieldset>
      <p class="hint">
        The processor, memory and displays are read from this machine, and the network speed is the browser's own
        estimate. Nothing is sent anywhere.
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
    legend {
      margin-bottom: 0.375rem;
      padding: 0;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .part {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.3rem 0;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .hint {
      margin-top: 0.75rem;
    }
  `,
})
export class SystemSettings {
  protected readonly webos = inject(WebOSCore);

  protected setShown(part: SystemPart, event: Event): void {
    const shown = (event.target as HTMLInputElement).checked;
    this.webos.send((core) => core.system.setShown(part, shown));
  }
}
