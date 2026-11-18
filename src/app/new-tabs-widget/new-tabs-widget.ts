import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { WebOSCore } from '../webos-core';

/**
 * The New Tabs Widget: the new tabs opened today, large, over a bar for each
 * of the last seven days, today's in the accent colour. The bars are scaled to
 * the busiest day; a day without one is a thin line. Pointing at a bar shows
 * its day's count in small type just above it, while today's stays put. Each
 * day's date and count are read out to screen readers. It opens no App.
 */
@Component({
  selector: 'webos-new-tabs-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('new-tabs') }}</h2>
    @if (webos.newTabs(); as tabs) {
      <div class="body">
        <p class="count" aria-hidden="true">
          <span class="number">{{ tabs.today }}</span>
          <span class="unit">today</span>
        </p>
        <p class="visually-hidden">{{ tabsOf(tabs.today) }} today</p>
        <ol class="week" aria-label="The last seven days" (mouseleave)="pointedDate.set(undefined)">
          @for (day of tabs.days; track day.date) {
            <li
              [class.today]="day.today"
              [class.pointed]="day.date === pointedDate()"
              (mouseenter)="pointedDate.set(day.date)"
            >
              <span class="column" aria-hidden="true" [style.--share]="day.count / tabs.most">
                <span class="bar"></span>
                @if (day.date === pointedDate()) {
                  <span class="value">{{ day.count }}</span>
                }
              </span>
              <span class="letter" aria-hidden="true">{{ day.letter }}</span>
              <span class="visually-hidden">{{ day.label }}: {{ tabsOf(day.count) }}</span>
            </li>
          }
        </ol>
      </div>
    }
  `,
  styleUrl: './new-tabs-widget.css',
})
export class NewTabsWidget {
  protected readonly webos = inject(WebOSCore);

  /** The day whose bar the pointer is on, kept as its date so its count stays live. */
  protected readonly pointedDate = signal<string | undefined>(undefined);

  protected tabsOf(count: number): string {
    return count === 1 ? '1 new tab' : `${count} new tabs`;
  }
}
