/** 12-hour time, e.g. "9:05 AM". Built by hand so the space is always a plain one. */
export function formatTime(time: Date): string {
  const hours = time.getHours();
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const period = hours < 12 ? 'AM' : 'PM';
  return `${hours % 12 || 12}:${minutes} ${period}`;
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
