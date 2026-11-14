import type ICALModule from 'ical.js';
import { formatTime, formatWhen, MONTHS } from '../format';
import { sunOnDay, type SunOnDay } from '../sky/sun';
import type { WeatherCity } from '../sky/weather';
import { daysFrom, isoDate, parseIsoDate, relativeDayLabel } from './calendar';

/**
 * Apple Calendar, webOS's first Data Source: the user's iCloud events, read
 * over CalDAV by the `CalendarServer` edge and kept as a cache of occurrences,
 * already expanded, for the Calendar Widget's dots and Day View.
 */

/** The iCloud account webOS signs in with: an Apple ID and an app-specific password. */
export interface AppleAccount {
  appleId: string;
  password: string;
}

/** One of the account's calendars, and whether the Calendar shows its events. */
export interface AppleCalendarChoice {
  /** The calendar's CalDAV address: how webOS tells calendars apart. */
  url: string;
  name: string;
  /** A CSS colour, e.g. "#1badf8". */
  color: string;
  shown: boolean;
}

/** One occurrence of an event, as stored: a recurring event is stored once per occurrence. */
export type CalendarEvent = {
  /** The `url` of the calendar it is in. */
  calendar: string;
  title: string;
  location?: string;
} & (
  | {
      allDay: true;
      /** The first day, as `2026-11-24`. */
      startDate: string;
      /** The day after the last, as iCalendar has it. */
      endDate: string;
    }
  | {
      allDay: false;
      /** Epoch milliseconds. */
      start: number;
      end: number;
    }
);

/** The last sync: when it was, the days it covered (both included), and every event in them. */
export interface AppleCalendarSync {
  fetchedAt: number;
  from: string;
  to: string;
  events: CalendarEvent[];
}

/** Apple Calendar as stored in the state document. */
export interface AppleCalendarState {
  account: AppleAccount | null;
  calendars: AppleCalendarChoice[];
  /** A cache: backups leave it out, with the account. */
  sync: AppleCalendarSync | null;
}

export const NO_APPLE_CALENDAR: AppleCalendarState = { account: null, calendars: [], sync: null };

/** Why the last sync failed: Apple refused the sign-in, or the sync couldn't be made. */
export type AppleCalendarProblem = 'refused' | 'failed';

/** What Settings › Apple Calendar shows. */
export type AppleCalendarStatus =
  | { connected: false }
  | {
      connected: true;
      appleId: string;
      calendars: readonly AppleCalendarChoice[];
      /** When the last sync was, e.g. "9:41 AM" or "Yesterday"; undefined before the first. */
      syncedAt?: string;
      syncing: boolean;
      problem?: AppleCalendarProblem;
    };

/** What the Day View lists for an event. */
export interface DayEvent {
  title: string;
  /** "All day", "10:00 AM – 11:30 AM", "Until 9:00 AM" or "From 10:00 PM". */
  time: string;
  location?: string;
  /** The calendar's name and colour. */
  calendar: string;
  color: string;
}

/** A day in full, for the Calendar Widget's Day View. */
export interface CalendarDayView {
  date: string;
  /** e.g. "Tuesday" */
  weekday: string;
  /** The month it is in, e.g. "November": where the Day View goes back to. */
  month: string;
  /** e.g. "November 24, 2026" */
  label: string;
  /** e.g. "Tue, Nov 24": the heading of a small Day View. */
  shortLabel: string;
  /** "Today", "Tomorrow", "in 3 days" */
  relative: string;
  week: number;
  holiday?: string;
  countdowns: readonly string[];
  /** All-day events first, then the rest by when they start. */
  events: readonly DayEvent[];
  /** Why the events may be missing or out of date: not synced yet, outside the synced range, or a failed sync. */
  notice?: string;
  /** Sunrise and sunset in the Weather city, if one is chosen. */
  sun?: SunOnDay;
}

const MINUTE = 60_000;
/** A new tab syncs again once the last sync is this old. */
const SYNC_AFTER_MS = 15 * MINUTE;
/** The most occurrences of one recurring event looked at, so a broken rule can't run forever. */
const MAX_OCCURRENCES = 20_000;
/** The most days one event is marked on in the month, so an event over years doesn't fill every grid. */
const MAX_DAYS_MARKED = 366;
/** The fallback colour of a calendar that gives none. */
export const DEFAULT_COLOR = '#6f8fdc';

const pad = (n: number) => String(n).padStart(2, '0');

/** The days a sync covers at `now`: from the first of last month to the last day of the sixth month ahead. */
export function syncRange(now: Date): { from: string; to: string; start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 7, 1);
  return { from: isoDate(start), to: isoDate(new Date(end.getFullYear(), end.getMonth(), 0)), start, end };
}

/** Whether a new tab should sync again. */
export const isDue = (sync: AppleCalendarSync | null, now: number) => !sync || now - sync.fetchedAt >= SYNC_AFTER_MS;

/** Whether two accounts sign in the same way, so a sync for one still fits the other. */
export const sameAccount = (a: AppleAccount, b: AppleAccount) => a.appleId === b.appleId && a.password === b.password;

/** The calendars from a sync, keeping whether each known one is shown; new ones are shown. */
export function mergeCalendars(
  known: readonly AppleCalendarChoice[],
  found: readonly { url: string; name: string; color?: string }[],
): AppleCalendarChoice[] {
  return found.map((calendar) => ({
    url: calendar.url,
    name: calendar.name,
    color: calendar.color || DEFAULT_COLOR,
    shown: known.find((choice) => choice.url === calendar.url)?.shown ?? true,
  }));
}

let ical: Promise<typeof ICALModule> | undefined;
/** ical.js, loaded the first time events are read, so it stays out of the initial bundle. */
const loadIcal = () => (ical ??= import('ical.js').then((module) => module.default));

/**
 * The occurrences of the events in `resources` (the iCalendar text of each
 * event resource in one calendar) that overlap `start`–`end`. Recurrences are
 * expanded, with their exceptions; cancelled occurrences are left out. A
 * resource that can't be read is skipped.
 */
export async function readEvents(calendar: string, resources: readonly string[], start: Date, end: Date): Promise<CalendarEvent[]> {
  const ICAL = await loadIcal();
  const events: CalendarEvent[] = [];
  for (const text of resources) {
    try {
      events.push(...occurrencesIn(ICAL, calendar, text, start.getTime(), end.getTime()));
    } catch (error) {
      console.warn('webOS skipped an Apple Calendar event it could not read', error);
    }
  }
  return events;
}

function occurrencesIn(ICAL: typeof ICALModule, calendar: string, text: string, start: number, end: number): CalendarEvent[] {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const zone of root.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(new ICAL.Timezone(zone));
  const vevents = root.getAllSubcomponents('vevent');
  const masters = vevents.filter((vevent) => !vevent.hasProperty('recurrence-id'));
  const found: CalendarEvent[] = [];
  const add = (item: InstanceType<typeof ICAL.Event>, from: InstanceType<typeof ICAL.Time>, to: InstanceType<typeof ICAL.Time>) => {
    if (String(item.component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') return;
    const event = toEvent(calendar, item, from, to);
    if (overlaps(event, start, end)) found.push(event);
  };

  for (const master of masters) {
    const event = new ICAL.Event(master);
    for (const exception of vevents) {
      if (exception.hasProperty('recurrence-id') && exception.getFirstPropertyValue('uid') === event.uid) event.relateException(exception);
    }
    if (!event.isRecurring()) {
      add(event, event.startDate, event.endDate);
      continue;
    }
    const occurrences = event.iterator();
    for (let n = 0, next = occurrences.next(); next && n < MAX_OCCURRENCES; n++, next = occurrences.next()) {
      if (next.toJSDate().getTime() >= end) break;
      const details = event.getOccurrenceDetails(next);
      add(details.item, details.startDate, details.endDate);
    }
  }
  // A moved occurrence whose recurring event isn't in this resource still counts on its own.
  for (const orphan of vevents.filter((vevent) => vevent.hasProperty('recurrence-id'))) {
    const uid = orphan.getFirstPropertyValue('uid');
    if (masters.some((master) => master.getFirstPropertyValue('uid') === uid)) continue;
    const event = new ICAL.Event(orphan);
    add(event, event.startDate, event.endDate);
  }
  return found;
}

function toEvent(
  calendar: string,
  item: InstanceType<typeof ICALModule.Event>,
  from: InstanceType<typeof ICALModule.Time>,
  to: InstanceType<typeof ICALModule.Time> | null,
): CalendarEvent {
  const title = (item.summary ?? '').trim() || 'Untitled event';
  const location = (item.location ?? '').trim();
  const base = { calendar, title, ...(location ? { location } : {}) };
  if (from.isDate) {
    const startDate = `${from.year}-${pad(from.month)}-${pad(from.day)}`;
    const last = to && to.isDate ? `${to.year}-${pad(to.month)}-${pad(to.day)}` : '';
    // An all-day event without an end lasts its one day.
    const endDate = last > startDate ? last : isoDate(new Date(from.year, from.month - 1, from.day + 1));
    return { ...base, allDay: true, startDate, endDate };
  }
  const start = from.toJSDate().getTime();
  const end = to ? Math.max(start, to.toJSDate().getTime()) : start;
  return { ...base, allDay: false, start, end };
}

/** Local midnight at the start of a `2026-11-24` date, as epoch milliseconds. */
const midnight = (date: string) => parseIsoDate(date)?.getTime() ?? NaN;

function overlaps(event: CalendarEvent, start: number, end: number): boolean {
  if (event.allDay) return midnight(event.startDate) < end && midnight(event.endDate) > start;
  return event.start < end && (event.end > start || (event.start === event.end && event.start >= start));
}

/** The dates (`2026-11-24`) an event is on, in local time: an all-day one's days, a timed one's every day it overlaps. */
function datesOf(event: CalendarEvent): string[] {
  const first = event.allDay ? parseIsoDate(event.startDate) : new Date(event.start);
  if (!first) return [];
  const dates: string[] = [];
  for (let n = 0; n < MAX_DAYS_MARKED; n++) {
    const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + n);
    const date = isoDate(day);
    if (event.allDay ? date >= event.endDate : n > 0 && day.getTime() >= event.end) break;
    dates.push(date);
  }
  return dates;
}

/** The shown calendars' events. */
function shownEvents(state: AppleCalendarState): CalendarEvent[] {
  if (!state.account || !state.sync) return [];
  const shown = new Set(state.calendars.filter((calendar) => calendar.shown).map((calendar) => calendar.url));
  return state.sync.events.filter((event) => shown.has(event.calendar));
}

/** The titles of the shown events on each date, for the month's dots and tooltips. */
export function eventTitlesByDate(state: AppleCalendarState): Map<string, string[]> {
  const byDate = new Map<string, string[]>();
  for (const event of sortEvents(shownEvents(state))) {
    for (const date of datesOf(event)) byDate.set(date, [...(byDate.get(date) ?? []), event.title]);
  }
  return byDate;
}

/** All-day events first by title, then the rest by when they start, then by title. */
function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  const key = (event: CalendarEvent) => (event.allDay ? -Infinity : event.start);
  return [...events].sort((a, b) => key(a) - key(b) || a.title.localeCompare(b.title));
}

/** When an event is on `date`, in words; events that cover the whole day count as all day. */
function timeOn(event: CalendarEvent, dayStart: number, dayEnd: number): string {
  if (event.allDay) return 'All day';
  const startsToday = event.start >= dayStart;
  const endsToday = event.end <= dayEnd;
  const at = (time: number) => formatTime(new Date(time));
  if (startsToday && endsToday) return event.start === event.end ? at(event.start) : `${at(event.start)} – ${at(event.end)}`;
  if (startsToday) return `From ${at(event.start)}`;
  if (endsToday) return `Until ${at(event.end)}`;
  return 'All day';
}

/** A synced range's last day as a notice names it: "May 31, 2027". */
const longDate = (date: string) => {
  const day = parseIsoDate(date);
  return day ? `${MONTHS[day.getMonth()]} ${day.getDate()}, ${day.getFullYear()}` : date;
};

/**
 * The Day View of `date` (`2026-11-24`) at `now`, with the holiday and
 * Countdowns `marks` give it, the shown Apple Calendar events, and sunrise and
 * sunset in the Weather `city`. Undefined for text that isn't a date.
 */
export function dayView(
  date: string,
  now: Date,
  {
    week,
    holiday,
    countdowns,
    apple,
    problem,
    city,
  }: {
    week: number;
    holiday?: string;
    countdowns: readonly string[];
    apple: AppleCalendarState;
    problem?: AppleCalendarProblem;
    city: WeatherCity | null;
  },
): CalendarDayView | undefined {
  const day = parseIsoDate(date);
  if (!day) return undefined;
  const dayStart = day.getTime();
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
  const colors = new Map(apple.calendars.map((calendar) => [calendar.url, calendar]));

  const events = sortEvents(shownEvents(apple).filter((event) => overlaps(event, dayStart, dayEnd)))
    .map((event) => ({ event, time: timeOn(event, dayStart, dayEnd) }))
    // Events covering the whole day go with the all-day ones, at the top.
    .sort((a, b) => Number(b.time === 'All day') - Number(a.time === 'All day'))
    .map(({ event, time }) => ({
      title: event.title,
      time,
      ...(event.location ? { location: event.location } : {}),
      calendar: colors.get(event.calendar)?.name ?? '',
      color: colors.get(event.calendar)?.color ?? DEFAULT_COLOR,
    }));

  let notice: string | undefined;
  if (apple.account) {
    if (problem === 'refused') notice = 'Apple refused the password. Sign in again in Settings.';
    else if (!apple.sync) notice = problem === 'failed' ? 'Apple Calendar couldn’t be reached.' : 'Syncing Apple Calendar…';
    else if (date < apple.sync.from || date > apple.sync.to) {
      notice = `Apple Calendar is synced from ${longDate(apple.sync.from)} to ${longDate(apple.sync.to)}.`;
    } else if (problem === 'failed') notice = `Apple Calendar couldn’t be reached. Synced ${formatWhen(new Date(apple.sync.fetchedAt), now)}.`;
  }

  return {
    date,
    weekday: day.toLocaleDateString('en-US', { weekday: 'long' }),
    month: day.toLocaleDateString('en-US', { month: 'long' }),
    label: day.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    shortLabel: day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    relative: relativeDayLabel(daysFrom(now, day)),
    week,
    ...(holiday ? { holiday } : {}),
    countdowns,
    events,
    ...(notice ? { notice } : {}),
    ...(city ? { sun: sunOnDay(city, day.getFullYear(), day.getMonth(), day.getDate()) } : {}),
  };
}

/** What Settings shows for the stored state and this tab's sync. */
export function appleCalendarStatus(
  state: AppleCalendarState,
  { syncing, problem, now }: { syncing: boolean; problem?: AppleCalendarProblem; now: Date },
): AppleCalendarStatus {
  if (!state.account) return { connected: false };
  return {
    connected: true,
    appleId: state.account.appleId,
    calendars: state.calendars,
    ...(state.sync ? { syncedAt: formatWhen(new Date(state.sync.fetchedAt), now) } : {}),
    syncing,
    ...(problem ? { problem } : {}),
  };
}
