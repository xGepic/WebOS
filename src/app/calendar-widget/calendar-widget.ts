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
  styles: `
    :host {
      container-type: size;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 0.5rem 0.75rem;
      font-size: clamp(0.6875rem, min(4.2cqh, 4.6cqi), 1rem);
    }
    button {
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 1px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 0.25em;
      margin-bottom: 0.35em;
    }
    .title {
      min-width: 7.5em;
      margin: 0;
      padding: 0.15em 0.5em;
      color: var(--text-secondary);
      font-size: 0.9375rem;
      font-weight: 500;
      text-align: center;
    }
    .year {
      color: var(--text-secondary);
      font-weight: 400;
    }
    .nav {
      width: 1.6rem;
      height: 1.6rem;
      border-radius: var(--radius-pill);
      color: var(--text-secondary);
      font-size: 1.05rem;
      line-height: 1;
    }
    .nav:hover {
      background: var(--control-fill);
      color: var(--text-primary);
    }
    table {
      border-collapse: collapse;
      font-variant-numeric: tabular-nums;
      text-align: center;
    }
    th {
      padding-bottom: 0.2em;
      color: var(--text-secondary);
      font-size: 0.8em;
      font-weight: 600;
    }
    abbr {
      text-decoration: none;
    }
    th.week {
      padding: 0 0.45em 0 0;
      font-weight: 500;
      opacity: 0.45;
    }
    td {
      padding: 0.05em 0.08em;
    }
    .day {
      display: inline-grid;
      place-items: center;
      width: 1.8em;
      height: 1.8em;
      padding: 0;
      border-radius: var(--radius-pill);
    }
    .day:hover {
      background: var(--control-fill-hover);
    }
    .outside {
      opacity: 0.28;
    }
    .today,
    .today:hover {
      background: var(--accent);
      color: var(--on-accent);
      font-weight: 650;
      opacity: 1;
    }
    /* The reset above clears the shared .button fill, so it is set again here. */
    .today-button {
      margin-top: 0.3em;
      padding: 0.2rem 0.75rem;
      border-radius: var(--radius-pill);
      background: var(--control-fill);
      font-size: 0.75rem;
      font-weight: 600;
    }
    .today-button:hover {
      background: var(--control-fill-hover);
    }
    .today-button.hidden {
      visibility: hidden;
    }
  `,
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
