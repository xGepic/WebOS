import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { WidgetSize } from '../../core';
import { WebOSCore } from '../webos-core';

/**
 * The Clock Widget: 12-hour time, today's date and a greeting by time of day.
 * It has no surface: thin type straight on the wallpaper. At its large size it
 * spans the Desktop's width and centres a very large time, as in the Stage layout.
 */
@Component({
  selector: 'webos-clock-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.full-width]': "size() === 'L'" },
  template: `
    <p class="greeting">{{ webos.greeting() }}</p>
    <time class="time">{{ webos.time() }}</time>
    <p class="date">{{ webos.date() }}</p>
  `,
  styles: `
    /* Fills its grid placement; the time scales with the space the Widget's size gives it. */
    :host {
      container-type: size;
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
      padding: 1rem 1.375rem;
      border-radius: var(--radius-widget);
    }
    :host(.full-width) {
      align-items: center;
      text-align: center;
    }
    p {
      margin: 0;
    }
    .greeting {
      color: var(--text-secondary);
      font-size: 0.9375rem;
      font-weight: 500;
      letter-spacing: var(--tracking-caption);
    }
    .time {
      margin-top: 0.25rem;
      font-size: clamp(2rem, min(36cqh, 18cqi), 6rem);
      font-weight: 200;
      line-height: 1.02;
      letter-spacing: var(--tracking-display);
      font-variant-numeric: tabular-nums;
    }
    :host(.full-width) .greeting {
      font-size: clamp(1.25rem, 10cqh, 1.625rem);
      font-weight: 400;
      letter-spacing: -0.01em;
    }
    :host(.full-width) .time {
      margin-top: 0.125rem;
      font-size: min(44cqh, 16cqi);
      line-height: 1;
    }
    .date {
      margin-top: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.9375rem;
      letter-spacing: var(--tracking-caption);
    }
  `,
})
export class ClockWidget {
  protected readonly webos = inject(WebOSCore);
  readonly size = input.required<WidgetSize>();
}
