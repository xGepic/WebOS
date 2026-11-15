import { formatShortDate } from '../format';
import type { DayEvent } from './apple-calendar';
import { daysFrom, parseIsoDate, relativeDayLabel } from './calendar';
import type { BridgeDay } from './holidays';

/**
 * The Day View: one day in full, shown by the Today Widget. It brings
 * together what the other parts of the time area know about the day: its
 * holiday or bridge day, its Countdowns and its Apple Calendar events.
 */

/** A day in full, for the Today Widget's Day View. */
export interface CalendarDayView {
  date: string;
  /** e.g. "Tuesday" */
  weekday: string;
  /** The month it is in, e.g. "November". */
  month: string;
  /** e.g. "November 24, 2026" */
  label: string;
  /** e.g. "Tue, Nov 24": the heading of a small Day View. */
  shortLabel: string;
  /** "Today", "Tomorrow", "in 3 days" */
  relative: string;
  week: number;
  holiday?: string;
  /** On a bridge day, the days off in a row if it is taken off, and which: "Thu, May 14 – Sun, May 17". */
  bridge?: { days: number; span: string };
  countdowns: readonly string[];
  /** All-day events first, then the rest by when they start. */
  events: readonly DayEvent[];
  /** Why the events may be missing or out of date: not synced yet, outside the synced range, or a failed sync. */
  notice?: string;
}

/** What is known about a day, for its Day View. */
export interface DayContents {
  week: number;
  holiday?: string;
  bridge?: BridgeDay;
  countdowns: readonly string[];
  events: readonly DayEvent[];
  notice?: string;
}

/** A day of a bridge day's span: "Thu, May 14". */
const shortDay = (date: string) => {
  const day = parseIsoDate(date);
  return day ? formatShortDate(day) : date;
};

/** The Day View of `date` (`2026-11-24`) at `now`, with what is known about it. Undefined for text that isn't a date. */
export function dayView(
  date: string,
  now: Date,
  { week, holiday, bridge, countdowns, events, notice }: DayContents,
): CalendarDayView | undefined {
  const day = parseIsoDate(date);
  if (!day) return undefined;
  return {
    date,
    weekday: day.toLocaleDateString('en-US', { weekday: 'long' }),
    month: day.toLocaleDateString('en-US', { month: 'long' }),
    label: day.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    shortLabel: formatShortDate(day),
    relative: relativeDayLabel(daysFrom(now, day)),
    week,
    ...(holiday ? { holiday } : {}),
    ...(bridge ? { bridge: { days: bridge.days, span: `${shortDay(bridge.from)} – ${shortDay(bridge.to)}` } } : {}),
    countdowns,
    events,
    ...(notice ? { notice } : {}),
  };
}
