/** 12-hour clock time, optionally with seconds. Built by hand so the space before AM/PM is always a plain one. */
function clockTime(time: Date, { seconds = false } = {}): string {
  const second = seconds ? ':' + String(time.getSeconds()).padStart(2, '0') : '';
  return formatWallTime({ hours: time.getHours(), minutes: time.getMinutes() }, second);
}

function formatWallTime({ hours, minutes }: Pick<WallClock, 'hours' | 'minutes'>, seconds = ''): string {
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')}${seconds} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** 12-hour time, e.g. "9:05 AM": local time, or the wall-clock time in `timeZone` (an IANA name) when given. */
export function formatTime(time: Date, timeZone?: string): string {
  return timeZone ? formatWallTime(wallClock(time, timeZone)) : clockTime(time);
}

/** What a wall clock in some time zone shows at a moment. `month` is 0-based, like `Date`'s. */
interface WallClock {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
}

const zonedFormats = new Map<string, Intl.DateTimeFormat>();

/**
 * The date and time a wall clock in `timeZone` (an IANA name such as
 * "Asia/Tokyo") shows at `time`; local time without one. Throws a RangeError
 * for a time zone the browser doesn't know.
 */
export function wallClock(time: Date, timeZone?: string): WallClock {
  if (!timeZone) {
    return { year: time.getFullYear(), month: time.getMonth(), day: time.getDate(), hours: time.getHours(), minutes: time.getMinutes() };
  }
  let format = zonedFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    });
    zonedFormats.set(timeZone, format);
  }
  const parts = format.formatToParts(time);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: part('year'), month: part('month') - 1, day: part('day'), hours: part('hour') % 24, minutes: part('minute') };
}

/** Whether the browser knows `timeZone`, an IANA name such as "Asia/Tokyo". */
export function isTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || !timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * How far ahead of UTC a wall clock in `timeZone` is at `time`, in minutes
 * (negative behind it); the local offset without one.
 */
export function utcOffsetMinutes(time: Date, timeZone?: string): number {
  if (!timeZone) return -time.getTimezoneOffset();
  const wall = wallClock(time, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month, wall.day, wall.hours, wall.minutes);
  return Math.round((asUtc - Math.floor(time.getTime() / 60_000) * 60_000) / 60_000);
}

/** A length of time in whole minutes, e.g. "9 h 41 min", "5 h", "12 min". */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.round(Math.abs(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

/** Today's date, e.g. "Thursday, November 12". */
export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const monthDayYear = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days from `earlier` to `later`, in local time. */
function calendarDaysBetween(earlier: Date, later: Date): number {
  const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  // Rounded, because a day across a daylight-saving change is 23 or 25 hours long.
  return Math.round((midnight(later) - midnight(earlier)) / DAY_MS);
}

/** When something happened, as a list shows it: "9:05 AM" today, then "Yesterday", "Nov 10", "Nov 10, 2025". */
export function formatWhen(at: Date, now: Date): string {
  const days = calendarDaysBetween(at, now);
  if (days <= 0) return formatTime(at);
  if (days === 1) return 'Yesterday';
  return at.getFullYear() === now.getFullYear() ? monthDay.format(at) : monthDayYear.format(at);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A moment in local time, to the second, e.g. "Thu, Nov 12, 2026, 9:05:30 AM". */
export function formatDateTime(date: Date): string {
  const day = `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  return `${day}, ${clockTime(date, { seconds: true })}`;
}
