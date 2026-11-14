import { Injectable, computed, inject, signal } from '@angular/core';
import { WebOSCore } from '../webos-core';

/**
 * The day the Today Widget shows: today, unless a day was picked in the
 * Calendar or stepped to in the Today Widget. UI-only and per tab, like the
 * month the Calendar shows: every new tab starts on today.
 */
@Injectable({ providedIn: 'root' })
export class SelectedDay {
  private readonly webos = inject(WebOSCore);
  /** The picked day, or undefined for today, so it follows the date at midnight. */
  private readonly picked = signal<string | undefined>(undefined);

  /** The day shown, as `2026-11-24`. */
  readonly date = computed(() => this.picked() ?? this.webos.calendar.today());
  /** The picked day, if one is picked: what the Calendar rings. */
  readonly pickedDate = this.picked.asReadonly();
  /** Whether the Today Widget is on the Desktop, so the Calendar has somewhere to show a day. */
  readonly shown = computed(() => this.webos.layout()?.some((placed) => placed.widget === 'today') ?? false);

  /** Shows `date`; picking today, or the day already picked, goes back to today. */
  pick(date: string): void {
    this.picked.set(date === this.webos.calendar.today() || date === this.picked() ? undefined : date);
  }

  /** Moves the day shown by `days`. */
  step(days: number): void {
    const date = this.date();
    if (date) this.pick(this.webos.calendar.addDays(date, days));
  }

  /** Back to today. */
  reset(): void {
    this.picked.set(undefined);
  }
}
