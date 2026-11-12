import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Stands in for an App that hasn't been built yet. */
@Component({
  selector: 'webos-app-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ name() }} is on its way.</p>`,
  styles: `
    :host {
      display: grid;
      place-items: center;
      height: 100%;
      color: var(--text-secondary);
    }
  `,
})
export class AppPlaceholder {
  readonly name = input.required<string>();
}
