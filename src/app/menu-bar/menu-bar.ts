import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/**
 * The Menu Bar across the top: the webOS mark and the open App's name on the
 * left, the 12-hour time on the right.
 */
@Component({
  selector: 'webos-menu-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material material-bar', role: 'banner' },
  template: `
    <span class="mark">
      <!-- The webOS mark: an eclipse, after the wallpaper. Original artwork. -->
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5a2 6.25 0 0 0 0-12.5z" fill="currentColor" />
      </svg>
      webOS
    </span>
    @if (window.app(); as app) {
      <span class="app-name">{{ webos.appName(app) }}</span>
    }
    <span class="spacer"></span>
    <time class="time">{{ webos.time() }}</time>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0 0 auto;
      z-index: 10;
      height: var(--menu-bar-height);
      display: flex;
      align-items: center;
      padding: 0 1rem;
      font-size: 0.8125rem;
      font-weight: 500;
      letter-spacing: var(--tracking-caption);
    }
    .mark {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-weight: 700;
      letter-spacing: var(--tracking-title);
    }
    .app-name {
      margin-left: 1.25rem;
      font-weight: 600;
    }
    .spacer {
      flex: 1;
    }
    .time {
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class MenuBar {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);
}
