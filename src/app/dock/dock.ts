import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChildren,
} from '@angular/core';
import { prefersReducedMotion, springTo } from '../../motion/springs';
import { WebOSCore } from '../webos-core';
import { AppIcon } from './app-icon';

/** Largest extra scale, for the icon right under the pointer. Kept subtle; --dock-clearance leaves room for it. */
const MAX_MAGNIFICATION = 0.25;
/** Icons further than this from the pointer (in px, centre to centre) don't grow. */
const MAGNIFICATION_RANGE = 150;

/**
 * The Dock along the bottom, with an icon per App. Icons magnify on a spring
 * as the pointer moves along the Dock; under reduced motion they don't.
 */
@Component({
  selector: 'webos-dock',
  imports: [AppIcon],
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
      <button #icon type="button" class="icon" [attr.aria-label]="app.name" [title]="app.name">
        <webos-app-icon [app]="app.id" />
      </button>
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
  private readonly icons = viewChildren<ElementRef<HTMLButtonElement>>('icon');

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
