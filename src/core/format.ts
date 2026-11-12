/** 12-hour clock time, optionally with seconds. Built by hand so the space before AM/PM is always a plain one. */
function clockTime(time: Date, { seconds = false } = {}): string {
  const hours = time.getHours();
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const second = seconds ? ':' + String(time.getSeconds()).padStart(2, '0') : '';
  return `${hours % 12 || 12}:${minutes}${second} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** 12-hour time, e.g. "9:05 AM". */
export function formatTime(time: Date): string {
  return clockTime(time);
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
