/** One day in the Calendar Widget's grid. */
export interface CalendarDay {
  /** The date as `2026-11-30`: how the Widget names, copies and describes a day. */
  date: string;
  /** Day of the month, 1–31. */
  day: number;
  /** False for the days of the previous and next months that fill the first and last weeks. */
  inMonth: boolean;
  today: boolean;
}

/** A row of the grid: Monday to Sunday, with its ISO week number. */
export interface CalendarWeek {
  number: number;
  days: CalendarDay[];
}

/** A month the Calendar Widget shows, in weeks starting on Monday. */
export interface CalendarMonth {
  /** e.g. "November" */
  month: string;
  year: number;
  /** Whether this is the month that contains today. */
  current: boolean;
  /** Short weekday names, Monday first. */
  weekdays: readonly string[];
  /**
   * Six weeks, Monday to Sunday, starting with the one that holds the 1st:
   * every month the same height, so browsing doesn't move the arrows.
   */
  weeks: CalendarWeek[];
}

/** A day described for the line under the grid: "Mon, Nov 30 · in 18 days · week 49". */
export interface CalendarDayDetails {
  date: string;
  /** e.g. "Mon, Nov 30" */
  label: string;
  /** "today", "tomorrow", "yesterday", "in 18 days" or "3 days ago" */
  relative: string;
  /** The ISO week number. */
  week: number;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
/** Enough for any month: one that starts on a Sunday and has 31 days spans six weeks. */
const WEEKS_SHOWN = 6;
const DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, '0');
/** A local date as `2026-11-30`. */
export const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
/** Whole days from the epoch for a local calendar date, unaffected by daylight-saving changes. */
const dayNumber = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY;

/** The ISO 8601 week number: weeks start on Monday, and week 1 is the one with the year's first Thursday. */
function isoWeek(date: Date): number {
  const weekday = (date.getDay() + 6) % 7;
  // The Thursday of this week decides which year, and so which week, it belongs to.
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekday + 3);
  const firstOfYear = new Date(thursday.getFullYear(), 0, 1);
  return Math.floor((dayNumber(thursday) - dayNumber(firstOfYear)) / 7) + 1;
}

/**
 * The month `offset` months from the one containing `now` (0 is the current
 * month, -1 the one before), in local time.
 */
export function monthView(now: Date, offset = 0): CalendarMonth {
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = first.getFullYear();
  const month = first.getMonth();
  // Monday is 0 here, Sunday 6.
  const leading = (first.getDay() + 6) % 7;
  const today = isoDate(now);

  const weeks: CalendarWeek[] = [];
  for (let week = 0; week < WEEKS_SHOWN; week++) {
    const days: CalendarDay[] = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      // Built from the date parts, not by adding milliseconds, so daylight-saving changes can't shift a day.
      const date = new Date(year, month, 1 - leading + week * 7 + weekday);
      days.push({ date: isoDate(date), day: date.getDate(), inMonth: date.getMonth() === month, today: isoDate(date) === today });
    }
    weeks.push({ number: isoWeek(new Date(year, month, 1 - leading + week * 7)), days });
  }
  return {
    month: first.toLocaleDateString('en-US', { month: 'long' }),
    year,
    current: offset === 0,
    weekdays: WEEKDAYS,
    weeks,
  };
}

/** A date written as `2026-11-30`, as a local midnight. Undefined for text that isn't a real date. */
export function parseIsoDate(date: string): Date | undefined {
  const match = ISO_DATE.exec(date);
  if (!match) return undefined;
  const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return isoDate(day) === date ? day : undefined;
}

/** Whole calendar days from the day of `now` to `day` (negative if it is before), unaffected by daylight saving. */
export const daysFrom = (now: Date, day: Date) => dayNumber(day) - dayNumber(now);

/** Whole days from today in words: "today", "tomorrow", "yesterday", "in 18 days" or "3 days ago". */
function relativeDay(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** `relativeDay` as a label on its own line, with "Today", "Tomorrow" and "Yesterday" capitalized: "Tomorrow", "in 18 days". */
export function relativeDayLabel(days: number): string {
  const words = relativeDay(days);
  return Math.abs(days) <= 1 ? words.charAt(0).toUpperCase() + words.slice(1) : words;
}

/** A day as the line under the grid describes it, relative to `now`. Undefined for text that isn't a date. */
export function describeDay(date: string, now: Date): CalendarDayDetails | undefined {
  const day = parseIsoDate(date);
  if (!day) return undefined;
  return {
    date,
    label: day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    relative: relativeDay(daysFrom(now, day)),
    week: isoWeek(day),
  };
}

/** The date `days` days after `date` (both as `2026-11-30`). */
export function addDays(date: string, days: number): string {
  const match = ISO_DATE.exec(date);
  if (!match) return date;
  return isoDate(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
}

/** The same day `months` months after `date`, or that month's last day if it is shorter: Jan 31 + 1 is Feb 28. */
export function addMonths(date: string, months: number): string {
  const match = ISO_DATE.exec(date);
  if (!match) return date;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1 + months;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return isoDate(new Date(year, month, Math.min(Number(match[3]), lastDay)));
}

/** How many months after the month containing `now` the month of `date` is (negative if before). */
export function monthOffset(date: string, now: Date): number {
  const match = ISO_DATE.exec(date);
  if (!match) return 0;
  return (Number(match[1]) - now.getFullYear()) * 12 + (Number(match[2]) - 1 - now.getMonth());
}
