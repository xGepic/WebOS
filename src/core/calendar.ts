/** One day in the Calendar Widget's grid. */
export interface CalendarDay {
  /** Day of the month, 1–31. */
  day: number;
  /** False for the days of the previous and next months that fill the first and last weeks. */
  inMonth: boolean;
  today: boolean;
}

/** The month the Calendar Widget shows: the current one, in weeks starting on Monday. */
export interface CalendarMonth {
  /** e.g. "November" */
  month: string;
  year: number;
  /** Short weekday names, Monday first. */
  weekdays: readonly string[];
  /** Whole weeks, Monday to Sunday, covering every day of the month. */
  weeks: CalendarDay[][];
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** The current month around `now`, in local time. */
export function monthView(now: Date): CalendarMonth {
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  // Monday is 0 here, Sunday 6.
  const leading = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((leading + daysInMonth) / 7);

  const weeks: CalendarDay[][] = [];
  for (let week = 0; week < weekCount; week++) {
    const days: CalendarDay[] = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      // Built from the date parts, not by adding milliseconds, so daylight-saving changes can't shift a day.
      const date = new Date(year, month, 1 - leading + week * 7 + weekday);
      days.push({
        day: date.getDate(),
        inMonth: date.getMonth() === month,
        today: date.getFullYear() === year && date.getMonth() === now.getMonth() && date.getDate() === now.getDate(),
      });
    }
    weeks.push(days);
  }
  return { month: first.toLocaleDateString('en-US', { month: 'long' }), year, weekdays: WEEKDAYS, weeks };
}
