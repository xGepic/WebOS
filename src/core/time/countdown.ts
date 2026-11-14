import { daysFrom, parseIsoDate, relativeDayLabel } from './calendar';

/**
 * A day the user is counting down to, such as a race or a release, or, when it
 * was added with a day that had already passed, counting up from.
 */
export interface Countdown {
  id: string;
  title: string;
  /** The day, as `2027-04-26`, in local time. */
  date: string;
  /**
   * Whether it counts up from its day: set when it is added or changed with a
   * day that has passed. One that was ahead is cleared once its day passes
   * instead. Absent in Countdowns from builds before counting up.
   */
  countsUp?: boolean;
}

/** What the user types to add or change a Countdown. */
export interface CountdownInput {
  title: string;
  date: string;
}

/** A Countdown as the Countdown Widget shows it. */
export interface CountdownView extends Countdown {
  /** e.g. "Sun, Apr 26", with the year when it isn't this year's: "Sun, Apr 26, 2027" */
  label: string;
  /** Whole days to go, or since its day for one that counts up: 0 on the day itself. */
  days: number;
  /** Whether it counts up from its day, which has passed. */
  countsUp: boolean;
  /** "Today", "Tomorrow", "in 47 days", or for one that counts up "Yesterday" or "12 days ago" */
  relative: string;
}

/**
 * The input cleaned up, counting up if its day has passed on `now`. Undefined
 * if it has no title or isn't a real date.
 */
function clean({ title, date }: CountdownInput, now: Date): Omit<Countdown, 'id'> | undefined {
  const trimmed = title.trim();
  const day = parseIsoDate(date);
  if (!trimmed || !day) return undefined;
  return daysFrom(now, day) < 0 ? { title: trimmed, date, countsUp: true } : { title: trimmed, date };
}

/** Adds a Countdown, counting up if its day has passed. Undefined if the title is blank or the date isn't a real one. */
export function addCountdown(list: readonly Countdown[], id: string, input: CountdownInput, now: Date): Countdown[] | undefined {
  const cleaned = clean(input, now);
  return cleaned && [...list, { id, ...cleaned }];
}

/**
 * Changes a Countdown's title and day. It counts up if its new day has passed,
 * and down otherwise. Undefined if the title is blank or the date isn't a real one.
 */
export function editCountdown(list: readonly Countdown[], id: string, input: CountdownInput, now: Date): Countdown[] | undefined {
  const cleaned = clean(input, now);
  return (
    cleaned &&
    list.map((countdown) => {
      if (countdown.id !== id) return countdown;
      const { countsUp: _, ...rest } = countdown;
      return { ...rest, ...cleaned };
    })
  );
}

export function deleteCountdown(list: readonly Countdown[], id: string): Countdown[] {
  return list.filter((countdown) => countdown.id !== id);
}

/** Whether a Countdown is still shown: its day hasn't passed, or it counts up. */
const isShown = (countdown: Countdown, now: Date) => countdown.countsUp === true || daysFrom(now, parseIsoDate(countdown.date) ?? now) >= 0;

/** The Countdowns the Desktop keeps when it loads: those whose day hasn't passed, and those counting up. */
export function clearPassed(list: readonly Countdown[], now: Date): Countdown[] {
  return list.filter((countdown) => isShown(countdown, now));
}

/**
 * The Countdowns the Widget shows: today's and later ones, soonest first, then
 * those counting up, the most recent day first.
 */
export function shown(list: readonly Countdown[], now: Date): CountdownView[] {
  return list
    .flatMap((countdown) => {
      const day = parseIsoDate(countdown.date);
      if (!day || !isShown(countdown, now)) return [];
      const daysTo = daysFrom(now, day);
      const label = day.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: day.getFullYear() === now.getFullYear() ? undefined : 'numeric',
      });
      const countsUp = daysTo < 0;
      return [{ ...countdown, label, days: Math.abs(daysTo), countsUp, relative: relativeDayLabel(daysTo) }];
    })
    .sort((a, b) => Number(a.countsUp) - Number(b.countsUp) || a.days - b.days || a.title.localeCompare(b.title));
}
