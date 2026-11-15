import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, viewChild } from '@angular/core';
import type { NextEvent } from '../../core';
import { AmbientMode } from '../ambient/ambient-mode';
import { DesktopEditor } from '../desktop/desktop-editor';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/**
 * The Menu Bar across the top: the webOS mark, which opens About webOS, and
 * the open App's name on the left; the Next Event and the 12-hour time on the
 * right. Clicking the time starts Ambient mode. In Edit Mode it offers the hidden Widgets; "Done" is in the Dock.
 * Searching is the Search Widget's job.
 */
@Component({
  selector: 'webos-menu-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material material-bar', role: 'banner' },
  template: `
    <button #mark type="button" class="mark" title="About webOS" (click)="window.toggle('about')">
      <!-- The webOS mark: an eclipse, after the wallpaper. Original artwork. -->
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5a2 6.25 0 0 0 0-12.5z" fill="currentColor" />
      </svg>
      webOS
    </button>
    @if (editor.editing()) {
      <span class="app-name">Editing Desktop</span>
      @if (hidden().length) {
        <span class="hidden-label">Hidden:</span>
        @for (widget of hidden(); track widget) {
          <button
            type="button"
            class="chip"
            [attr.aria-label]="'Show the ' + webos.widgetName(widget) + ' Widget'"
            (click)="editor.show(widget)"
          >
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
    @if (webos.nextEvent(); as event) {
      <span class="next-event" [title]="eventDetails(event)">
        <span class="event-color" [style.background]="event.color" aria-hidden="true"></span>
        <span class="event-title">{{ event.title }}</span>
        <span class="event-when">{{ event.when }}</span>
      </span>
    }
    <button type="button" class="time" title="Ambient mode" (click)="ambient.start()">
      <time>{{ webos.time() }}</time>
    </button>
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
    /* The webOS mark and the time are quiet buttons: they open About webOS and start Ambient mode. */
    .mark,
    .time {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      margin-left: -0.4rem;
      padding: 0.15rem 0.4rem;
      border: 0;
      border-radius: var(--radius-control);
      background: none;
      color: inherit;
      font: inherit;
      font-weight: 700;
      letter-spacing: var(--tracking-title);
      cursor: pointer;
    }
    .mark:hover,
    .time:hover {
      background: var(--control-fill-hover);
    }
    .mark:active,
    .time:active {
      background: var(--control-fill-active);
    }
    .mark:focus-visible,
    .time:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 1px;
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
    .spacer {
      flex: 1;
    }
    /* The Next Event gives way first when the Menu Bar is crowded: its title shortens, its time never does. */
    .next-event {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
      max-width: 22rem;
      margin-right: 0.5rem;
    }
    .event-color {
      flex: none;
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .event-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .event-when {
      flex: none;
      color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
    }
    /* The mark's look, at the weight and spacing of the rest of the Menu Bar, and as far right as the mark is left. */
    .time {
      margin-right: -0.4rem;
      margin-left: 0;
      font-weight: 500;
      letter-spacing: var(--tracking-caption);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class MenuBar {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);
  protected readonly editor = inject(DesktopEditor);
  protected readonly ambient = inject(AmbientMode);
  protected readonly hidden = computed(() => this.webos.hiddenWidgets() ?? []);
  private readonly mark = viewChild.required<ElementRef<HTMLButtonElement>>('mark');

  constructor() {
    // About webOS opens out of the webOS mark and closes back into it.
    effect(() => this.window.registerOrigin('about', this.mark().nativeElement));
  }

  /** The Next Event in full, for its tooltip: "Standup · 9:30 AM – 9:45 AM · Zoom · Work". */
  protected eventDetails(event: NextEvent): string {
    return [event.title, event.time, event.location, event.calendar].filter(Boolean).join(' · ');
  }
}
