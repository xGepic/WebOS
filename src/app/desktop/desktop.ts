import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ClockWidget } from '../clock-widget/clock-widget';
import { LinksWidget } from '../links-widget/links-widget';
import { TodosWidget } from '../todos-widget/todos-widget';
import { WebOSCore } from '../webos-core';

/** The Desktop: the snap grid between the Menu Bar and the Dock, with each Widget at its layout position. */
@Component({
  selector: 'webos-desktop',
  imports: [ClockWidget, LinksWidget, TodosWidget],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--grid-columns]': 'webos.grid()?.columns',
    '[style.--grid-rows]': 'webos.grid()?.rows',
  },
  template: `
    @for (placed of webos.layout(); track placed.widget) {
      <div
        class="placement"
        [style.grid-column]="placed.column + 1 + ' / span ' + placed.columns"
        [style.grid-row]="placed.row + 1 + ' / span ' + placed.rows"
      >
        @switch (placed.widget) {
          @case ('clock') {
            <webos-clock-widget />
          }
          @case ('links') {
            <webos-links-widget />
          }
          @case ('todos') {
            <webos-todos-widget />
          }
        }
      </div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: var(--menu-bar-height) 0 var(--dock-clearance) 0;
      display: grid;
      grid-template-columns: repeat(var(--grid-columns), minmax(0, 1fr));
      grid-template-rows: repeat(var(--grid-rows), minmax(0, 1fr));
      gap: 1rem;
      padding: 1.25rem 1.5rem 0;
    }
    .placement {
      display: grid;
      min-width: 0;
      min-height: 0;
    }
  `,
})
export class Desktop {
  protected readonly webos = inject(WebOSCore);
}
