import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/**
 * The Countdown Widget: the days to go until each Countdown, soonest first.
 * The soonest one is shown large; a Countdown leaves once its day has passed.
 * Clicking it opens the Countdowns App, which springs out of this Widget, to
 * add, change and delete them.
 */
@Component({
  selector: 'webos-countdown-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('countdown') }}</h2>
    @if (webos.upcomingCountdowns(); as countdowns) {
      @if (countdowns.length) {
        <!-- A click anywhere opens the Countdowns App; the list stays scrollable above the control. -->
        <button type="button" class="widget-open" aria-label="Edit Countdowns" (click)="window.open('countdowns')"></button>
        <ol class="widget-open-above" (click)="window.open('countdowns')">
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
        <div class="widget-empty">
          <p>Count down to a race, a release or a holiday.</p>
          <button type="button" class="button" (click)="window.open('countdowns')">Add a Countdown</button>
        </div>
      }
    }
  `,
  styleUrl: './countdown-widget.css',
})
export class CountdownWidget {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    this.window.registerOrigin('countdowns', element);
    inject(DestroyRef).onDestroy(() => this.window.unregisterOrigin('countdowns', element));
  }
}
