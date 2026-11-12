import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { springTo } from '../../motion/springs';
import { Toasts } from './toasts';

/**
 * Shows the current toast under the Menu Bar. It springs in (a fade under
 * reduced motion) and is announced to screen readers.
 */
@Component({
  selector: 'webos-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', 'aria-live': 'polite' },
  template: `
    @if (toasts.toast(); as toast) {
      <div #pill class="pill material material-raised">{{ toast.message }}</div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      top: calc(var(--menu-bar-height) + 0.75rem);
      inset-inline: 0;
      z-index: 40;
      display: flex;
      justify-content: center;
      pointer-events: none;
    }
    .pill {
      padding: 0.45rem 1rem;
      border-radius: var(--radius-pill);
      font-size: 0.8125rem;
      font-weight: 600;
    }
  `,
})
export class Toast {
  protected readonly toasts = inject(Toasts);
  private readonly injector = inject(Injector);
  private readonly pill = viewChild<ElementRef<HTMLElement>>('pill');

  constructor() {
    effect(() => {
      if (!this.toasts.toast()) return;
      untracked(() =>
        afterNextRender(
          () => {
            const pill = this.pill()?.nativeElement;
            if (pill) springTo(pill, { opacity: [0, 1], y: [-8, 0] });
          },
          { injector: this.injector },
        ),
      );
    });
  }
}
