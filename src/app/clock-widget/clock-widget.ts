import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebOSCore } from '../webos-core';

/** The Clock Widget: 12-hour time, today's date and a greeting by time of day. */
@Component({
  selector: 'webos-clock-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
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
    p {
      margin: 0;
    }
    .greeting {
      color: var(--text-secondary);
      font-size: 0.9375rem;
      font-weight: 600;
      letter-spacing: var(--tracking-caption);
    }
    .time {
      margin-top: 0.25rem;
      font-size: clamp(2rem, min(36cqh, 18cqi), 6rem);
      font-weight: 650;
      line-height: 1.02;
      letter-spacing: var(--tracking-display);
      font-variant-numeric: tabular-nums;
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
}
