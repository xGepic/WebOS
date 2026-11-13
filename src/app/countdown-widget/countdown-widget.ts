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
  styleUrl: './countdown-widget.css',
})
export class CountdownWidget {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);
}
