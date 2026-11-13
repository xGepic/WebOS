import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { AppId } from '../../core';
import { collapseInto, expandFrom, settle } from '../../motion/flip';
import { springTo } from '../../motion/springs';
import { DevUtilitiesApp } from '../apps/dev-utilities/dev-utilities-app';
import { NotesApp } from '../apps/notes/notes-app';
import { SettingsApp } from '../apps/settings/settings-app';
import { WebOSCore } from '../webos-core';
import { WindowState } from './window-state';

type Phase = 'closed' | 'open' | 'closing';

/** The two elements every Window transition moves: the Window itself and the scrim behind it. */
interface WindowElements {
  frame: HTMLElement;
  backdrop: HTMLElement;
}

/**
 * The single Window. It springs out of the open App's Dock icon and closes
 * back into it, and closes on Esc, its close control, a click on the
 * Desktop around it, or a click on the open App's Dock icon. Opening another App swaps the content in place.
 */
@Component({
  selector: 'webos-window',
  imports: [NotesApp, DevUtilitiesApp, SettingsApp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeOnEscape()' },
  template: `
    @if (renderedApp(); as app) {
      <div #backdrop class="backdrop" (click)="close()"></div>
      <section #frame class="frame material material-raised" role="dialog" aria-labelledby="window-title" tabindex="-1">
        <header>
          <h2 id="window-title">{{ webos.appName(app) }}</h2>
          <button type="button" class="close" aria-label="Close" (click)="close()">
            <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <div class="content">
          @switch (app) {
            @case ('notes') {
              <webos-notes-app />
            }
            @case ('dev-utilities') {
              <webos-dev-utilities-app />
            }
            @case ('settings') {
              <webos-settings-app />
            }
          }
        </div>
      </section>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 4;
      background: var(--scrim);
      opacity: 0;
    }
    .frame {
      position: fixed;
      inset: calc(var(--menu-bar-height) + 1.25rem) 0 var(--dock-clearance);
      z-index: 5;
      width: min(60rem, calc(100vw - 3rem));
      margin-inline: auto;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: var(--radius-window);
      outline: none;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0.875rem 0.75rem 1.25rem;
      border-bottom: 1px solid var(--material-border);
    }
    h2 {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      letter-spacing: var(--tracking-caption);
    }
    .close {
      display: grid;
      place-items: center;
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: var(--control-fill);
      color: var(--text-secondary);
      cursor: pointer;
    }
    .close:hover {
      background: var(--control-fill-hover);
      color: var(--text-primary);
    }
    .close:active {
      background: var(--control-fill-active);
    }
    .close:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
    .content {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
  `,
})
export class AppWindow {
  protected readonly webos = inject(WebOSCore);
  private readonly state = inject(WindowState);
  private readonly injector = inject(Injector);
  private readonly frame = viewChild<ElementRef<HTMLElement>>('frame');
  private readonly backdrop = viewChild<ElementRef<HTMLElement>>('backdrop');

  /** The App whose content is on screen. Unlike the open App, it stays set while the Window closes. */
  protected readonly renderedApp = signal<AppId | undefined>(undefined);
  private phase: Phase = 'closed';
  /** Bumped on every open, so a close that was interrupted doesn't remove the Window afterwards. */
  private generation = 0;

  constructor() {
    effect(() => {
      const app = this.state.app();
      untracked(() => (app ? this.show(app) : this.hide()));
    });
  }

  protected close(): void {
    this.state.close();
  }

  /** Esc closes the Window only while one is open, leaving Esc free for others otherwise. */
  protected closeOnEscape(): void {
    if (this.state.app()) this.close();
  }

  private show(app: AppId): void {
    const wasClosing = this.phase === 'closing';
    const wasClosed = this.phase === 'closed';
    this.generation++;
    this.phase = 'open';
    this.renderedApp.set(app);

    if (wasClosing) {
      this.animate(({ frame, backdrop }) => {
        settle(frame);
        springTo(backdrop, { opacity: 1 });
      });
    } else if (wasClosed) {
      this.afterRender(({ frame, backdrop }) => {
        const icon = this.state.originFor(app);
        if (icon) expandFrom(frame, icon);
        springTo(backdrop, { opacity: 1 });
        this.focusInside(frame);
      });
    } else {
      this.afterRender(({ frame }) => this.focusInside(frame));
    }
  }

  private hide(): void {
    const app = this.renderedApp();
    if (this.phase !== 'open' || !app) return;
    this.phase = 'closing';
    const generation = this.generation;

    this.animate(({ frame, backdrop }) => {
      const icon = this.state.originFor(app);
      if (icon && frame.contains(document.activeElement)) icon.focus({ preventScroll: true });
      springTo(backdrop, { opacity: 0 });
      const collapse = icon ? collapseInto(frame, icon) : springTo(frame, { opacity: 0 });
      collapse.finished.then(() => {
        if (this.generation !== generation) return;
        this.phase = 'closed';
        this.renderedApp.set(undefined);
      });
    });
  }

  /** Runs `step` with the Window's elements, which are on screen right now. */
  private animate(step: (elements: WindowElements) => void): void {
    const frame = this.frame()?.nativeElement;
    const backdrop = this.backdrop()?.nativeElement;
    if (frame && backdrop) step({ frame, backdrop });
  }

  /** Runs `step` once the Window's elements have been rendered. */
  private afterRender(step: (elements: WindowElements) => void): void {
    afterNextRender(() => this.animate(step), { injector: this.injector });
  }

  /** Moves focus into the Window: its first visible field if it has one, otherwise the Window itself. */
  private focusInside(frame: HTMLElement): void {
    const fields = frame.querySelectorAll<HTMLElement>('.content input, .content textarea, .content select');
    const field = [...fields].find((candidate) => candidate.checkVisibility());
    (field ?? frame).focus({ preventScroll: true });
  }
}
