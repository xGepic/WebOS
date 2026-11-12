import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebOSCore } from '../webos-core';

/** The Clock Widget: 12-hour time, today's date and a greeting by time of day. */
@Component({
  selector: 'webos-clock-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="greeting">{{ webos.greeting() }}</p>
    <time class="time">{{ webos.time() }}</time>
    <p class="date">{{ webos.date() }}</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      text-align: center;
    }
    p {
      margin: 0;
    }
    .greeting {
      font-size: 1.5rem;
      font-weight: 500;
      opacity: 0.85;
    }
    .time {
      font-size: 6rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .date {
      font-size: 1.25rem;
      opacity: 0.7;
    }
  `,
})
export class ClockWidget {
  protected readonly webos = inject(WebOSCore);
}
