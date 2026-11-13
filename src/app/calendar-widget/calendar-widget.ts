import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { Toasts } from '../toast/toasts';
import { WebOSCore } from '../webos-core';

/** Keys that move the active day, and by how much. */
const DAY_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const MONTH_STEPS: Record<string, number> = { PageUp: -1, PageDown: 1 };

/**
 * The Calendar Widget: a month in weeks starting on Monday, with ISO week
 * numbers and today marked. No events. Like the Clock it has no surface.
 *
 * ‹ and › browse months, and Today, shown under the grid while another
 * month is, goes back to the current one. Clicking a day (or Enter) copies
 * it as `2026-11-30`. Arrow keys move by day and week, Page Up and Page Down
 * by month. Every new tab starts on the current month.
 */
@Component({
  selector: 'webos-calendar-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (month(); as month) {
      <div class="header">
        <button type="button" class="nav" aria-label="Previous month" (click)="showMonth(offset() - 1)">‹</button>
        <p class="title" aria-live="polite">
          {{ month.month }}
          @if (!month.current) {
            <span class="year">{{ month.year }}</span>
          }
        </p>
        <button type="button" class="nav" aria-label="Next month" (click)="showMonth(offset() + 1)">›</button>
      </div>
      <table>
        <caption class="visually-hidden">{{ month.month }} {{ month.year }}</caption>
        <thead>
          <tr>
            <th scope="col" class="week"><abbr title="Week">W</abbr></th>
            @for (weekday of month.weekdays; track weekday) {
              <th scope="col">
                <abbr [title]="weekday">{{ weekday.charAt(0) }}</abbr>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (week of month.weeks; track week.number) {
            <tr>
              <th scope="row" class="week">{{ week.number }}</th>
              @for (day of week.days; track day.date) {
                <td>
                  <button
                    type="button"
                    class="day"
                    [class.outside]="!day.inMonth"
                    [class.today]="day.today"
                    [attr.data-date]="day.date"
                    [attr.aria-current]="day.today ? 'date' : null"
                    [attr.aria-label]="labelFor(day.date)"
                    [tabindex]="day.date === tabStop() ? 0 : -1"
                    (focus)="active.set(day.date)"
                    (keydown)="onKey($event, day.date)"
                    (click)="copy(day.date)"
                  >
                    {{ day.day }}
                  </button>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
      <!-- Hidden, not removed, on the current month, so the grid stays put when it appears. -->
      <button type="button" class="button today-button" [class.hidden]="month.current" [attr.aria-hidden]="month.current" [tabindex]="month.current ? -1 : 0" (click)="showMonth(0)">
        Today
      </button>
    }
  `,
  styleUrl: './calendar-widget.css',
})
export class CalendarWidget {
  private readonly webos = inject(WebOSCore);
  private readonly toasts = inject(Toasts);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  /** Months from the current one. Per tab: every new tab starts on the current month. */
  protected readonly offset = signal(0);
  /** The day the keyboard last moved to or focused, if any. */
  protected readonly active = signal<string | undefined>(undefined);

  protected readonly month = computed(() => this.webos.calendar.month(this.offset()));
  /** The one day Tab lands on in the grid: the active day if it is in this month, else today, else the 1st. */
  protected readonly tabStop = computed(() => {
    const days = this.month()?.weeks.flatMap((week) => week.days) ?? [];
    const active = this.active();
    if (active && days.some((day) => day.date === active && day.inMonth)) return active;
    return (days.find((day) => day.today) ?? days.find((day) => day.inMonth))?.date;
  });

  protected labelFor(date: string): string {
    const details = this.webos.calendar.describe(date);
    return details ? `${details.label}, ${details.relative}. Copy ${date}` : date;
  }

  protected showMonth(offset: number): void {
    this.offset.set(offset);
  }

  protected async copy(date: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(date);
      this.toasts.show(`Copied ${date}`);
    } catch (error) {
      console.error('webOS could not copy to the clipboard', error);
      this.toasts.show('Couldn’t copy the date');
    }
  }

  protected onKey(event: KeyboardEvent, date: string): void {
    const days = DAY_STEPS[event.key];
    const months = MONTH_STEPS[event.key];
    if (days === undefined && months === undefined) return;
    event.preventDefault();
    // Step from the active day, not the focused button: focus follows a render later, so fast keys would repeat a step.
    const from = this.active() ?? date;
    const next = days !== undefined ? this.webos.calendar.addDays(from, days) : this.webos.calendar.addMonths(from, months);
    this.offset.set(this.webos.calendar.offsetOf(next));
    this.active.set(next);
    afterNextRender(() => this.host.querySelector<HTMLElement>(`[data-date="${next}"]`)?.focus(), { injector: this.injector });
  }
}
