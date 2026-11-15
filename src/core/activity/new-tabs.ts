import { formatShortDate } from '../format';
import { isRecord } from '../guards';
import { isoDate } from '../time/calendar';

/**
 * New Tabs opened on each local day, keyed `2026-11-15`. Only today and the
 * days before it that the Widget shows are kept; days without one are left out.
 */
export type NewTabCounts = Record<string, number>;

/** The days the Widget shows, and the core keeps: today and the six days before it. */
export const NEW_TAB_DAYS = 7;

/** One day on the New Tabs Widget. */
export interface NewTabDay {
  /** The local date, e.g. "2026-11-12". */
  date: string;
  /** The weekday's letter, e.g. "T". */
  letter: string;
  /** The date as the tooltip shows it, e.g. "Thu, Nov 12". */
  label: string;
  count: number;
  today: boolean;
}

export interface NewTabsView {
  /** The New Tabs opened today. */
  today: number;
  /** Today and the six days before it, oldest first. */
  days: NewTabDay[];
  /** The count of the busiest of those days, at least 1, to scale the bars by. */
  most: number;
}

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Today and the six days before it, oldest first, as local dates at midnight. */
function shownDays(now: Date): Date[] {
  return Array.from(
    { length: NEW_TAB_DAYS },
    (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - (NEW_TAB_DAYS - 1 - i)),
  );
}

/** The count saved for `date`, or 0 for none, or for one that isn't a whole number from 0 up. */
function countOn(counts: unknown, date: string): number {
  const count = isRecord(counts) ? counts[date] : undefined;
  return Number.isInteger(count) && (count as number) >= 0 ? (count as number) : 0;
}

/** `counts` with one more New Tab today, and only the days the Widget shows. */
export function withNewTab(counts: unknown, now: Date): NewTabCounts {
  const today = isoDate(now);
  return Object.fromEntries(
    shownDays(now).flatMap((day) => {
      const date = isoDate(day);
      const count = countOn(counts, date) + (date === today ? 1 : 0);
      return count ? [[date, count]] : [];
    }),
  );
}

export function newTabsView(counts: unknown, now: Date): NewTabsView {
  const today = isoDate(now);
  const days = shownDays(now).map((day): NewTabDay => {
    const date = isoDate(day);
    return {
      date,
      letter: LETTERS[day.getDay()],
      label: formatShortDate(day),
      count: countOn(counts, date),
      today: date === today,
    };
  });
  return { today: countOn(counts, today), days, most: Math.max(1, ...days.map((day) => day.count)) };
}
