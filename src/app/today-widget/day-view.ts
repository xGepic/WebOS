import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CalendarDayView } from '../../core';

/**
 * The Day View, the body of the Today Widget: one day in full. Its holiday and
 * Countdowns, the shown Apple Calendar events (all-day first, then by time),
 * and sunrise and sunset in the Weather city.
 *
 * ‹ and › (or ← and →) step through days; on another day, ‹ Today (or Esc)
 * goes back to today. Copy copies the date as `2026-11-24`. The list scrolls
 * when the day is full.
 */
@Component({
  selector: 'webos-day-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    '[attr.aria-label]': 'day().weekday + ", " + day().label',
    '(keydown)': 'onKey($event)',
  },
  template: `
    @let today = day();
    <div class="top">
      @if (!isToday()) {
        <button type="button" class="back" (click)="back.emit()"><span aria-hidden="true">‹</span> Today</button>
      }
      <div class="steps">
        <button type="button" class="step" aria-label="Previous day" (click)="step.emit(-1)">‹</button>
        <button type="button" class="step" aria-label="Next day" (click)="step.emit(1)">›</button>
      </div>
    </div>
    <h3 class="weekday" aria-live="polite">
      <span class="long">{{ today.weekday }}</span>
      <span class="short">{{ today.shortLabel }}</span>
    </h3>
    <p class="date">{{ today.label }}</p>
    <p class="meta">
      @if (!isToday()) {
        {{ today.relative }} ·
      }
      Week {{ today.week }}
    </p>

    <ul class="items">
      @if (today.holiday) {
        <li class="item">
          <span class="bar holiday" aria-hidden="true"></span>
          <span class="what">
            <span class="time">Holiday</span>
            <span class="title">{{ today.holiday }}</span>
          </span>
        </li>
      }
      @for (countdown of today.countdowns; track countdown) {
        <li class="item">
          <span class="bar countdown" aria-hidden="true"></span>
          <span class="what">
            <span class="time">Countdown</span>
            <span class="title">{{ countdown }}</span>
          </span>
        </li>
      }
      @for (event of today.events; track $index) {
        <li class="item">
          <span class="bar" aria-hidden="true" [style.background]="event.color"></span>
          <span class="what">
            <span class="time">{{ event.time }}</span>
            <span class="title" [title]="event.calendar">{{ event.title }}</span>
            @if (event.location) {
              <span class="location">{{ event.location }}</span>
            }
          </span>
        </li>
      }
      @if (!today.holiday && !today.countdowns.length && !today.events.length) {
        <li class="empty">Nothing on this day.</li>
      }
    </ul>

    @if (today.notice) {
      <p class="notice">{{ today.notice }}</p>
    }
    <div class="bottom">
      @if (today.sun; as sun) {
        <p class="sun">
          @if (sun.kind === 'day') {
            <span aria-hidden="true">☀</span> {{ sun.sunrise }} – {{ sun.sunset }}
          } @else {
            {{ sun.kind === 'polar-day' ? 'The sun doesn’t set' : 'The sun doesn’t rise' }}
          }
        </p>
      }
      <button type="button" class="copy" (click)="copy.emit()">Copy date</button>
    </div>
  `,
  styleUrl: './day-view.css',
})
export class DayView {
  readonly day = input.required<CalendarDayView>();
  /** Whether the day is today, so there is no way back to show. */
  readonly isToday = input(true);
  readonly back = output<void>();
  readonly step = output<number>();
  readonly copy = output<void>();

  protected onKey(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === 'Escape') {
      if (this.isToday()) return;
      event.preventDefault();
      event.stopPropagation();
      this.back.emit();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.step.emit(event.key === 'ArrowLeft' ? -1 : 1);
    }
  }
}
