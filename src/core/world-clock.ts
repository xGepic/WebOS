import { formatDuration, formatTime, isTimeZone, utcOffsetMinutes, wallClock } from './format';

/** A city on the World Clock, with the time zone its clock follows. */
export interface WorldClockCity {
  id: string;
  name: string;
  /** Empty when the geocoder gives none. */
  country: string;
  /** An IANA time zone, e.g. "Asia/Tokyo". */
  timeZone: string;
}

/** A city as the World Clock Widget shows it. */
export interface WorldClockView extends WorldClockCity {
  /** The city's time, e.g. "9:05 PM". */
  time: string;
  /** "Today", "Tomorrow" or "Yesterday", from here. */
  day: string;
  /** How far the city's clock is from this one: "9 h ahead", "5 h 30 min behind" or "Same time". */
  difference: string;
  /** Whether it is between 6 AM and 6 PM there, so night can be dimmed. */
  daytime: boolean;
}

/** The most cities the World Clock holds. */
export const MAX_WORLD_CLOCKS = 6;

/**
 * Adds a city at the end. Undefined if the city has no time zone the browser
 * knows, is already there, or the World Clock is full.
 */
export function addWorldClock(list: readonly WorldClockCity[], city: WorldClockCity): WorldClockCity[] | undefined {
  if (!isTimeZone(city.timeZone) || list.length >= MAX_WORLD_CLOCKS) return undefined;
  if (list.some((other) => other.name === city.name && other.timeZone === city.timeZone)) return undefined;
  return [...list, { id: city.id, name: city.name, country: city.country, timeZone: city.timeZone }];
}

export function deleteWorldClock(list: readonly WorldClockCity[], id: string): WorldClockCity[] {
  return list.filter((city) => city.id !== id);
}

/** Moves a city to `toIndex` (clamped to the list). */
export function moveWorldClock(list: readonly WorldClockCity[], id: string, toIndex: number): WorldClockCity[] {
  const from = list.findIndex((city) => city.id === id);
  if (from < 0) return [...list];
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, moved);
  return next;
}

/** Each city's time at `now`, in the order the user put them. Cities whose time zone the browser doesn't know are left out. */
export function worldClockView(list: readonly WorldClockCity[], now: Date): WorldClockView[] {
  const here = wallClock(now);
  const hereOffset = utcOffsetMinutes(now);
  return list.filter((city) => isTimeZone(city.timeZone)).map((city) => {
    const there = wallClock(now, city.timeZone);
    const daysAway = Math.round(
      (Date.UTC(there.year, there.month, there.day) - Date.UTC(here.year, here.month, here.day)) / 86_400_000,
    );
    const offset = utcOffsetMinutes(now, city.timeZone) - hereOffset;
    return {
      ...city,
      time: formatTime(now, city.timeZone),
      day: daysAway > 0 ? 'Tomorrow' : daysAway < 0 ? 'Yesterday' : 'Today',
      difference: offset === 0 ? 'Same time' : `${formatDuration(offset)} ${offset > 0 ? 'ahead' : 'behind'}`,
      daytime: there.hours >= 6 && there.hours < 18,
    };
  });
}
