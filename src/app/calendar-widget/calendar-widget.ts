import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebOSCore } from '../webos-core';

/**
 * The Calendar Widget: the current month in weeks starting on Monday, with
 * today marked. No events. Like the Clock it has no surface.
 */
@Component({
  selector: 'webos-calendar-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (webos.calendarMonth(); as month) {
      <table>
        <caption>
          {{ month.month }}
          <span class="visually-hidden">{{ month.year }}</span>
        </caption>
        <thead>
          <tr>
            @for (weekday of month.weekdays; track weekday) {
              <th scope="col">
                <abbr [title]="weekday">{{ weekday.charAt(0) }}</abbr>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (week of month.weeks; track $index) {
            <tr>
              @for (day of week; track $index) {
                <td [class.outside]="!day.inMonth">
                  <span class="day" [class.today]="day.today" [attr.aria-current]="day.today ? 'date' : null">{{ day.day }}</span>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: `
    :host {
      container-type: size;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 0.75rem 1rem;
    }
    table {
      border-collapse: collapse;
      font-size: clamp(0.6875rem, min(5.4cqh, 4.6cqi), 1rem);
      font-variant-numeric: tabular-nums;
      text-align: center;
    }
    caption {
      padding-bottom: 0.5em;
      color: var(--text-secondary);
      font-size: 0.9375rem;
      font-weight: 500;
    }
    th {
      padding-bottom: 0.25em;
      color: var(--text-secondary);
      font-size: 0.8em;
      font-weight: 600;
    }
    abbr {
      text-decoration: none;
    }
    td {
      padding: 0.08em 0.12em;
    }
    .day {
      display: inline-grid;
      place-items: center;
      width: 1.9em;
      height: 1.9em;
      border-radius: var(--radius-pill);
    }
    .outside {
      opacity: 0.28;
    }
    .today {
      background: var(--accent);
      color: var(--on-accent);
      font-weight: 650;
    }
  `,
})
export class CalendarWidget {
  protected readonly webos = inject(WebOSCore);
}
