import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Desktop } from './desktop/desktop';
import { Dock } from './dock/dock';
import { Toast } from './toast/toast';
import { MenuBar } from './menu-bar/menu-bar';
import { AppWindow } from './window/window';
import { WebOSCore } from './webos-core';

@Component({
  selector: 'webos-root',
  imports: [MenuBar, Desktop, AppWindow, Dock, Toast],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (webos.startupError(); as error) {
      <div class="startup-error material" role="alert">
        <h1>webOS couldn't start</h1>
        <p>{{ error }}</p>
        <p>Your data has been left untouched.</p>
      </div>
    } @else {
      <webos-menu-bar />
      <webos-desktop />
      <webos-window />
      <webos-dock />
      <webos-toast />
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
}
