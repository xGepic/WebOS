import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DesktopEditor } from '../desktop/desktop-editor';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/**
 * The Menu Bar across the top: the webOS mark and the open App's name on the
 * left, the 12-hour time on the right. In Edit Mode it offers the hidden
 * Widgets and "Done". Searching is the Search Widget's job.
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
    @if (editor.editing()) {
      <span class="app-name">Editing Desktop</span>
      @if (hidden().length) {
        <span class="hidden-label">Hidden:</span>
        @for (widget of hidden(); track widget) {
          <button type="button" class="chip" [attr.aria-label]="'Show the ' + webos.widgetName(widget) + ' Widget'" (click)="editor.show(widget)">
            + {{ webos.widgetName(widget) }}
          </button>
        }
      }
      @if (editor.notice(); as notice) {
        <span class="notice" role="status">{{ notice }}</span>
      }
    } @else if (window.app(); as app) {
      <span class="app-name">{{ webos.appName(app) }}</span>
    }
    <span class="spacer"></span>
    @if (editor.editing()) {
      <button type="button" class="chip done" (click)="editor.exit()">Done</button>
    }
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
      gap: 0.5rem;
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
      margin-left: 0.75rem;
      font-weight: 600;
    }
    .hidden-label,
    .notice {
      color: var(--text-secondary);
    }
    /* Compact buttons that fit the Menu Bar's height. */
    .chip {
      padding: 0.15rem 0.6rem;
      border: 0;
      border-radius: var(--radius-control);
      background: var(--control-fill);
      color: var(--text-primary);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .chip:hover {
      background: var(--control-fill-hover);
    }
    .chip:active {
      background: var(--control-fill-active);
    }
    .chip:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 1px;
    }
    .done {
      margin-right: 0.5rem;
      background: var(--accent);
      color: var(--on-accent);
    }
    .done:hover {
      background: var(--accent);
      filter: brightness(1.1);
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
  protected readonly editor = inject(DesktopEditor);
  protected readonly hidden = computed(() => this.webos.hiddenWidgets() ?? []);
}
