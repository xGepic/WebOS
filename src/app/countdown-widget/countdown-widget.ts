import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/**
 * The Countdown Widget: the days to go until each Countdown set in Settings,
 * soonest first. The soonest one is shown large; a Countdown leaves once its
 * day has passed.
 */
@Component({
  selector: 'webos-countdown-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('countdown') }}</h2>
    @if (webos.upcomingCountdowns(); as countdowns) {
      @if (countdowns.length) {
        <ol>
          @for (countdown of countdowns; track countdown.id; let first = $first) {
            <li [class.first]="first">
              <span class="days" [attr.aria-hidden]="true">
                @if (countdown.days === 0) {
                  Today
                } @else {
                  <span class="number">{{ countdown.days }}</span>
                  <span class="unit">{{ countdown.days === 1 ? 'day' : 'days' }}</span>
                }
              </span>
              <span class="what">
                <span class="title">{{ countdown.title }}</span>
                <span class="date">{{ countdown.label }}</span>
              </span>
              <span class="visually-hidden">{{ countdown.relative }}</span>
            </li>
          }
        </ol>
      } @else {
        <div class="empty">
          <p>Count down to a race, a release or a holiday.</p>
          <button type="button" class="button" (click)="window.open('settings')">Add one in Settings</button>
        </div>
      }
    }
  `,
  styles: `
    :host {
      container-type: size;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 1rem 0.75rem;
      border-radius: var(--radius-widget);
    }
    ol {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      margin: 0;
      padding: 0.25rem 0.5rem 0;
      overflow: auto;
      list-style: none;
      scrollbar-width: thin;
    }
    li {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      min-width: 0;
    }
    .days {
      flex: none;
      min-width: 3.25rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-variant-numeric: tabular-nums;
    }
    .number {
      color: var(--text-primary);
      font-size: 1.0625rem;
      font-weight: 500;
    }
    .unit {
      margin-left: 0.2em;
    }
    .what {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .title,
    .date {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .title {
      font-size: 0.875rem;
      font-weight: 500;
    }
    .date {
      color: var(--text-secondary);
      font-size: 0.75rem;
    }
    /* The soonest Countdown: its number large and thin, like the Clock's time. */
    li.first {
      flex-direction: column;
      gap: 0.125rem;
      margin-bottom: 0.375rem;
    }
    li.first .days {
      color: var(--text-primary);
      font-size: clamp(1.5rem, 22cqh, 2.75rem);
      font-weight: 200;
      letter-spacing: var(--tracking-display);
      line-height: 1;
    }
    li.first .number {
      font-size: inherit;
      font-weight: inherit;
    }
    li.first .unit {
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 400;
      letter-spacing: 0;
    }
    .empty {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 0.75rem;
      padding: 0 0.5rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    .empty p {
      margin: 0;
    }
  `,
})
export class CountdownWidget {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);
}
