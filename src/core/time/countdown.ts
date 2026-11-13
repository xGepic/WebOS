import { daysFrom, parseIsoDate } from './calendar';

/** A day the user is counting down to, such as a race or a release. */
export interface Countdown {
  id: string;
  title: string;
  /** The day, as `2027-04-26`, in local time. */
  date: string;
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
  /** Whole days to go: 0 on the day itself. */
  days: number;
  /** "Today", "Tomorrow" or "in 47 days" */
  relative: string;
}

/** The input cleaned up, or undefined if it has no title or isn't a real date. */
function clean({ title, date }: CountdownInput): CountdownInput | undefined {
  const trimmed = title.trim();
  return trimmed && parseIsoDate(date) ? { title: trimmed, date } : undefined;
}

/** Adds a Countdown. Undefined if the title is blank or the date isn't a real one. */
export function addCountdown(list: readonly Countdown[], id: string, input: CountdownInput): Countdown[] | undefined {
  const cleaned = clean(input);
  return cleaned && [...list, { id, ...cleaned }];
}

/** Changes a Countdown's title and day. Undefined if the title is blank or the date isn't a real one. */
export function editCountdown(list: readonly Countdown[], id: string, input: CountdownInput): Countdown[] | undefined {
  const cleaned = clean(input);
  return cleaned && list.map((countdown) => (countdown.id === id ? { ...countdown, ...cleaned } : countdown));
}

export function deleteCountdown(list: readonly Countdown[], id: string): Countdown[] {
  return list.filter((countdown) => countdown.id !== id);
}

/** The Countdowns whose day hasn't passed: the ones the Desktop keeps when it loads. */
export function clearPassed(list: readonly Countdown[], now: Date): Countdown[] {
  return list.filter((countdown) => daysFrom(now, parseIsoDate(countdown.date) ?? now) >= 0);
}

/** Today's and later Countdowns, soonest first, as the Widget shows them. */
export function upcoming(list: readonly Countdown[], now: Date): CountdownView[] {
  return list
    .flatMap((countdown) => {
      const day = parseIsoDate(countdown.date);
      if (!day) return [];
      const days = daysFrom(now, day);
      if (days < 0) return [];
      const label = day.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: day.getFullYear() === now.getFullYear() ? undefined : 'numeric',
      });
      const relative = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days} days`;
      return [{ ...countdown, label, days, relative }];
    })
    .sort((a, b) => a.days - b.days || a.title.localeCompare(b.title));
}
