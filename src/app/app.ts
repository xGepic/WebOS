import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ClockWidget } from './clock-widget/clock-widget';
import { WebOSCore } from './webos-core';

@Component({
  selector: 'webos-root',
  imports: [ClockWidget],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (webos.startupError(); as error) {
      <div class="startup-error" role="alert">
        <h1>webOS couldn't start</h1>
        <p>{{ error }}</p>
        <p>Your data has been left untouched.</p>
      </div>
    } @else {
      <webos-clock-widget />
    }
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      height: 100%;
    }
    .startup-error {
      max-width: 32rem;
      text-align: center;
    }
  `,
})
export class App {
  protected readonly webos = inject(WebOSCore);
}
