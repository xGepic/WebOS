import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import type { CalendarDay } from '../../core';
import { Toasts } from '../toast/toasts';
import { SelectedDay } from '../today-widget/selected-day';
import { WebOSCore } from '../webos-core';

/** Keys that move the active day, and by how much. */
const DAY_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const MONTH_STEPS: Record<string, number> = { PageUp: -1, PageDown: 1 };

/**
 * The Calendar Widget: a month in weeks starting on Monday, with ISO week
 * numbers and today marked. Weekends and public holidays are quieter; a
 * holiday, a Countdown and an Apple Calendar event each put a dot under their
 * day, named on hover. Like the Clock it has no surface.
 *
 * ‹ and › browse months, and Today, shown under the grid while another
 * month is, goes back to the current one. Clicking a day (or Enter) shows it
 * in the Today Widget, ringed here, and clicking it again goes back to today;
 * with the Today Widget hidden, it copies the day as `2026-11-30`. Arrow keys
 * move by day and week, Page Up and Page Down by month. Every new tab starts
 * on the current month.
 */
@Component({
  selector: 'webos-calendar-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (month(); as month) {
      <!-- Sized by the Host's box (see the CSS), so everything inside scales with the Widget. -->
      <div class="calendar">
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
                      [class.day-off]="day.weekend || !!day.holiday"
                      [class.picked]="day.date === selected.pickedDate()"
                      [attr.aria-pressed]="selected.shown() ? day.date === selected.pickedDate() : null"
                      [attr.data-date]="day.date"
                      [attr.aria-current]="day.today ? 'date' : null"
                      [attr.aria-label]="labelFor(day)"
                      [attr.title]="namesOf(day) || null"
                      [tabindex]="day.date === tabStop() ? 0 : -1"
                      (focus)="active.set(day.date)"
                      (keydown)="onKey($event, day.date)"
                      (click)="choose(day.date)"
                    >
                      {{ day.day }}
                      @if (day.holiday || day.countdowns.length || day.events.length) {
                        <span class="marks" aria-hidden="true">
                          @if (day.holiday) {
                            <span class="mark holiday-mark"></span>
                          }
                          @if (day.countdowns.length) {
                            <span class="mark countdown-mark"></span>
                          }
                          @if (day.events.length) {
                            <span class="mark event-mark"></span>
                          }
                        </span>
                      }
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
      </div>
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
  protected readonly selected = inject(SelectedDay);

  protected readonly month = computed(() => this.webos.calendar.month(this.offset()));

  constructor() {
    // A day picked, here or by stepping in the Today Widget, brings its month into view.
    effect(() => {
      const picked = this.selected.pickedDate();
      if (picked) untracked(() => this.offset.set(this.webos.calendar.offsetOf(picked)));
    });
  }
  /** The one day Tab lands on in the grid: the active day if it is in this month, else today, else the 1st. */
  protected readonly tabStop = computed(() => {
    const days = this.month()?.weeks.flatMap((week) => week.days) ?? [];
    const active = this.active();
    if (active && days.some((day) => day.date === active && day.inMonth)) return active;
    return (days.find((day) => day.today) ?? days.find((day) => day.inMonth))?.date;
  });

  protected labelFor(day: CalendarDay): string {
    const details = this.webos.calendar.describe(day.date);
    if (!details) return day.date;
    const names = this.namesOf(day);
    const action = this.selected.shown() ? 'Show in Today' : `Copy ${day.date}`;
    return `${details.label}, ${details.relative}.${names ? ` ${names}.` : ''} ${action}`;
  }

  /** The day's holiday, Countdowns and events, for its tooltip: "Christmas Day · Release · Standup". Empty for a plain day. */
  protected namesOf(day: CalendarDay): string {
    return [...(day.holiday ? [day.holiday] : []), ...day.countdowns, ...day.events].join(' · ');
  }

  /** Shows the day in the Today Widget, or copies it while the Today Widget is hidden. */
  protected choose(date: string): void {
    this.active.set(date);
    if (this.selected.shown()) this.selected.pick(date);
    else void this.copy(date);
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
