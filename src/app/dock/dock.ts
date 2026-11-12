import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  viewChildren,
} from '@angular/core';
import { prefersReducedMotion, springTo } from '../../motion/springs';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';
import { LinkIcon } from '../links-widget/link-icon';
import { AppIcon } from './app-icon';

/** Largest extra scale, for the icon right under the pointer. Kept subtle; --dock-clearance leaves room for it. */
const MAX_MAGNIFICATION = 0.25;
/** Icons further than this from the pointer (in px, centre to centre) don't grow. */
const MAGNIFICATION_RANGE = 150;

/**
 * The Dock along the bottom, with an icon per App and, after a divider, the
 * Docked Links. Icons magnify on a spring as the pointer moves along the Dock;
 * under reduced motion they don't. Clicking an App icon opens the App in the
 * Window, and clicking it again closes the Window. The open App's icon has a
 * dot under it. Docked Links are plain
 * anchors, so they open like any Link: this tab, or a background tab on
 * ⌘/Ctrl+click or middle-click.
 */
@Component({
  selector: 'webos-dock',
  imports: [AppIcon, LinkIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'material',
    role: 'group',
    'aria-label': 'Dock',
    '(pointermove)': 'magnify($event)',
    '(pointerleave)': 'restore()',
  },
  template: `
    @for (app of webos.apps(); track app.id) {
      <span class="slot">
        <button
          #appIcon
          type="button"
          class="icon"
          [attr.aria-label]="app.name"
          [attr.aria-current]="window.app() === app.id ? 'true' : null"
          [title]="app.name"
          (click)="window.toggle(app.id)"
        >
          <webos-app-icon [app]="app.id" />
        </button>
        <span class="open-indicator" [class.visible]="window.app() === app.id"></span>
      </span>
    }
    @if (webos.dockedLinks()?.length) {
      <span class="divider" aria-hidden="true"></span>
      @for (link of webos.dockedLinks(); track link.id) {
        <span class="slot">
          <a #linkIcon class="icon docked-link" [href]="link.url" [attr.aria-label]="link.title" [title]="link.title">
            <webos-link-icon class="link-icon" [link]="link" [resolution]="64" />
          </a>
        </span>
      }
    }
  `,
  styles: `
    :host {
      position: fixed;
      bottom: 0.875rem;
      inset-inline: 0;
      z-index: 10;
      width: fit-content;
      margin-inline: auto;
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      border-radius: calc(var(--dock-icon-size) * 0.42);
    }
    .slot {
      position: relative;
      display: flex;
    }
    .open-indicator {
      position: absolute;
      bottom: -0.45rem;
      left: 50%;
      width: 4px;
      height: 4px;
      margin-left: -2px;
      border-radius: 50%;
      background: var(--text-primary);
      opacity: 0;
    }
    .open-indicator.visible {
      opacity: 0.85;
    }
    .icon {
      width: var(--dock-icon-size);
      height: var(--dock-icon-size);
      padding: 0;
      border: 0;
      border-radius: calc(var(--dock-icon-size) * 0.23);
      background: none;
      cursor: pointer;
      transform-origin: 50% 100%;
    }
    .divider {
      align-self: center;
      width: 1px;
      height: calc(var(--dock-icon-size) * 0.75);
      margin-inline: 0.125rem;
      background: var(--material-border);
    }
    .docked-link {
      display: grid;
      place-items: center;
      box-sizing: border-box;
      border: 1px solid var(--material-border);
      background: var(--control-fill);
    }
    .link-icon {
      width: 55%;
      height: 55%;
    }
    /* Motion owns transform, so pressing darkens the icon instead, instantly. */
    .icon:active {
      filter: brightness(0.75);
    }
    .icon:focus-visible {
      outline: 2px solid var(--text-primary);
      outline-offset: 3px;
    }
  `,
})
export class Dock {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);
  private readonly appIcons = viewChildren<ElementRef<HTMLButtonElement>>('appIcon');
  private readonly linkIcons = viewChildren<ElementRef<HTMLAnchorElement>>('linkIcon');
  /** Every icon in the Dock, Apps then Docked Links, in order. */
  private readonly icons = computed(() => [...this.appIcons(), ...this.linkIcons()]);

  constructor() {
    // Let the Window find each App's icon to open out of and close into.
    effect(() => {
      const apps = this.webos.apps() ?? [];
      this.appIcons().forEach((icon, index) => {
        const app = apps[index];
        if (app) this.window.registerDockIcon(app.id, icon.nativeElement);
      });
    });
  }

  protected magnify(event: PointerEvent): void {
    if (prefersReducedMotion()) return this.restore();

    for (const { nativeElement: icon } of this.icons()) {
      // Icons scale from their bottom centre, so the centre's x doesn't move as they grow.
      const rect = icon.getBoundingClientRect();
      const centre = rect.left + rect.width / 2;
      const distance = Math.abs(event.clientX - centre);
      const closeness = Math.max(0, 1 - distance / MAGNIFICATION_RANGE);
      springTo(icon, { scale: 1 + MAX_MAGNIFICATION * closeness }, 'snappy');
    }
  }

  protected restore(): void {
    for (const { nativeElement: icon } of this.icons()) springTo(icon, { scale: 1 }, 'smooth');
  }
}
