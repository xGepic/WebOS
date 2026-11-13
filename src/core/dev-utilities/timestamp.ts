import { MONTHS, formatDateTime } from '../format';

/** A moment, as every form the Timestamp tab shows. */
export type TimestampResult =
  | {
      ok: true;
      /** How a typed timestamp was read; absent when converting from a date. */
      unit?: 'seconds' | 'milliseconds';
      /** Whole Unix seconds. */
      seconds: string;
      milliseconds: string;
      /** In local time, e.g. "Thu, Nov 12, 2026, 9:05:30 AM". */
      local: string;
      iso: string;
    }
  | { ok: false; error: string };

/**
 * Timestamps below this are read as seconds, at or above it as milliseconds.
 * In seconds it is the year 5138; in milliseconds, March 1973.
 */
const MILLISECONDS_FROM = 1e11;
/** The furthest a JavaScript Date reaches from 1970, either way. */
const MAX_DATE_MS = 8.64e15;

const NUMBER = /^-?\d+(?:\.\d+)?$/;
/** A date, optionally a time, optionally an offset: 2026-11-12, 2026-11-12 09:30, 2026-11-12T08:30:00.000Z, …+01:00. */
const ISO_LIKE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;
/** The local form this tab shows, read back: "Thu, Nov 12, 2026, 9:05:30 AM", weekday and seconds optional. */
const LOCAL_FORM = /^(?:[a-z]{3},\s*)?([a-z]{3})\s+(\d{1,2}),\s*(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m)$/i;

/** A local date and time, as numbers. Month is 1-based. */
interface LocalTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

/** The moment `milliseconds` after 1970, in every form. Fractions of a millisecond are dropped, as Date drops them. */
function toResult(milliseconds: number, unit?: 'seconds' | 'milliseconds'): TimestampResult {
  if (!Number.isFinite(milliseconds) || Math.abs(milliseconds) > MAX_DATE_MS) {
    return { ok: false, error: 'That is too far from today to be a date.' };
  }
  const whole = Math.trunc(milliseconds);
  const date = new Date(whole);
  return {
    ok: true,
    ...(unit && { unit }),
    seconds: String(Math.floor(whole / 1000)),
    milliseconds: String(whole),
    local: formatDateTime(date),
    iso: date.toISOString(),
  };
}

/**
 * The moment a local date and time names, or undefined if it names none: no
 * 30 February, and no time skipped when the clocks go forward.
 */
function localMoment(time: LocalTime): number | undefined {
  const date = new Date(0);
  date.setFullYear(time.year, time.month - 1, time.day);
  date.setHours(time.hour, time.minute, time.second, time.millisecond);
  const exists =
    date.getFullYear() === time.year &&
    date.getMonth() === time.month - 1 &&
    date.getDate() === time.day &&
    date.getHours() === time.hour &&
    date.getMinutes() === time.minute &&
    date.getSeconds() === time.second;
  return exists ? date.getTime() : undefined;
}

/** Minutes east of UTC for "Z", "+01:00" or "-0530"; undefined for an offset that can't be. */
function offsetMinutes(offset: string): number | undefined {
  if (offset.toUpperCase() === 'Z') return 0;
  const hours = Number(offset.slice(1, 3));
  const minutes = Number(offset.slice(-2));
  if (hours > 23 || minutes > 59) return undefined;
  return (offset.startsWith('-') ? -1 : 1) * (hours * 60 + minutes);
}

/** Reads a Unix timestamp, telling seconds from milliseconds by its size. */
function fromTimestamp(text: string): TimestampResult {
  const trimmed = text.trim();
  if (!NUMBER.test(trimmed)) return { ok: false, error: 'Enter a Unix timestamp in seconds or milliseconds, e.g. 1700000000.' };
  const value = Number(trimmed);
  return Math.abs(value) < MILLISECONDS_FROM ? toResult(value * 1000, 'seconds') : toResult(value, 'milliseconds');
}

/**
 * Reads a date: an ISO date, a date and time without an offset (local time),
 * or the local form this tab shows, so that it round-trips.
 */
function fromDate(text: string): TimestampResult {
  const invalid: TimestampResult = {
    ok: false,
    error: 'Enter a date like 2026-11-12 09:30, or an ISO date like 2026-11-12T08:30:00Z.',
  };
  const trimmed = text.trim();
  const local = LOCAL_FORM.exec(trimmed);
  if (local) {
    const [, monthName, day, year, hour, minute, second = '0', period] = local;
    const month = MONTHS.findIndex((name) => name.toLowerCase() === monthName.toLowerCase()) + 1;
    const twelveHour = Number(hour);
    if (!month || twelveHour < 1 || twelveHour > 12) return invalid;
    const moment = localMoment({
      year: Number(year),
      month,
      day: Number(day),
      hour: (twelveHour % 12) + (period.toLowerCase() === 'pm' ? 12 : 0),
      minute: Number(minute),
      second: Number(second),
      millisecond: 0,
    });
    return moment === undefined ? invalid : toResult(moment);
  }

  const match = ISO_LIKE.exec(trimmed);
  if (!match) return invalid;
  const [, year, month, day, hour = '0', minute = '0', second = '0', fraction = '', offset] = match;
  const time: LocalTime = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(fraction.slice(0, 3).padEnd(3, '0')),
  };
  // Even with an offset, the date and time must exist as written (no 30 February, no 25:00).
  const asLocal = localMoment(time);
  if (!offset) return asLocal === undefined ? invalid : toResult(asLocal);

  const minutesEast = offsetMinutes(offset);
  if (minutesEast === undefined || time.hour > 23 || time.minute > 59 || time.second > 59) return invalid;
  const utc = Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute, time.second, time.millisecond);
  const check = new Date(utc);
  if (check.getUTCMonth() !== time.month - 1 || check.getUTCDate() !== time.day) return invalid;
  return toResult(utc - minutesEast * 60_000);
}

/** Converts whichever was typed into the Timestamp tab's one field: a Unix timestamp or a date. */
export function convertTime(text: string): TimestampResult {
  if (NUMBER.test(text.trim())) return fromTimestamp(text);
  const date = fromDate(text);
  return date.ok
    ? date
    : { ok: false, error: 'Enter a Unix timestamp like 1700000000, or a date like 2026-11-12 09:30 or 2026-11-12T08:30:00Z.' };
}

/** The current moment, for the "now" button. */
export function now(at: Date): TimestampResult {
  return toResult(at.getTime());
}
