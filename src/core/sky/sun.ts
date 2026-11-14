import { formatDuration, formatTime, wallClock } from '../format';
import type { WeatherCity } from './weather';

/**
 * Sunrise and sunset for the Weather city, computed locally: no network.
 * Uses the sunrise equation (as NOAA's simplified solar position), which is
 * within about a minute away from the poles. The sun counts as up while its
 * upper edge is above the horizon, allowing for refraction (-0.833°).
 */

/** What the Sun Widget shows. */
export type SunView =
  | { status: 'no-city' }
  | {
      status: 'ready';
      city: string;
      /** The sun rises and sets today. */
      kind: 'day';
      /** e.g. "7:12 AM", in the city's time. */
      sunrise: string;
      sunset: string;
      /** e.g. "9 h 41 min" */
      dayLength: string;
      /** How today's daylight compares with yesterday's: "2 min shorter than yesterday", or "Same as yesterday". */
      change: string;
      /** How far the sun is through its day, 0 at sunrise and 1 at sunset; below 0 before, above 1 after. Draws the arc. */
      progress: number;
      /** "Sunset in 2 h 10 min", "Sunrise in 5 h", or after sunset, "Sunrise tomorrow at 7:14 AM". */
      next: string;
    }
  | {
      status: 'ready';
      city: string;
      /** Polar day (the sun doesn't set) or polar night (it doesn't rise). */
      kind: 'polar-day' | 'polar-night';
    };

const DAY_MS = 86_400_000;
const MINUTE = 60_000;
const J2000 = 2451545;
const UNIX_EPOCH_JD = 2440587.5;
const rad = (degrees: number) => (degrees * Math.PI) / 180;
const deg = (radians: number) => (radians * 180) / Math.PI;

/** When the sun rises and sets (epoch milliseconds) on a calendar day at a place, or which polar case it is. */
type SunTimes = { kind: 'day'; sunrise: number; sunset: number } | { kind: 'polar-day' | 'polar-night' };

/** Sunrise and sunset on the calendar day `year`-`month`-`day` (month 0-based) at `latitude`, `longitude`. */
function sunTimes(year: number, month: number, day: number, latitude: number, longitude: number): SunTimes {
  // Days from J2000 to noon UTC that day, then to the mean solar noon at this longitude.
  const n = Date.UTC(year, month, day, 12) / DAY_MS + UNIX_EPOCH_JD - J2000;
  const meanNoon = n - longitude / 360;
  const M = (357.5291 + 0.98560028 * meanNoon) % 360;
  const C = 1.9148 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 0.0003 * Math.sin(rad(3 * M));
  const lambda = (M + C + 180 + 102.9372) % 360;
  const transit = J2000 + meanNoon + 0.0053 * Math.sin(rad(M)) - 0.0069 * Math.sin(rad(2 * lambda));
  const declination = Math.asin(Math.sin(rad(lambda)) * Math.sin(rad(23.4397)));
  const cosHourAngle =
    (Math.sin(rad(-0.833)) - Math.sin(rad(latitude)) * Math.sin(declination)) / (Math.cos(rad(latitude)) * Math.cos(declination));
  if (cosHourAngle < -1) return { kind: 'polar-day' };
  if (cosHourAngle > 1) return { kind: 'polar-night' };
  const halfDay = deg(Math.acos(cosHourAngle)) / 360;
  // To the minute, as they are shown, so the times shown and the time to them agree.
  const toMs = (jd: number) => Math.floor(((jd - UNIX_EPOCH_JD) * DAY_MS) / MINUTE) * MINUTE;
  return { kind: 'day', sunrise: toMs(transit - halfDay), sunset: toMs(transit + halfDay) };
}

/** The calendar day `offset` days from the one the city's clock shows at `now`. */
function cityDay(now: Date, timeZone: string | undefined, offset: number) {
  const today = wallClock(now, timeZone);
  const date = new Date(Date.UTC(today.year, today.month, today.day + offset));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

/** Sunrise and sunset on a calendar day (month 0-based) in the Weather `city`, for the Calendar's Day View. */
export type SunOnDay = { kind: 'day'; sunrise: string; sunset: string } | { kind: 'polar-day' | 'polar-night' };

export function sunOnDay(city: WeatherCity, year: number, month: number, day: number): SunOnDay {
  const times = sunTimes(year, month, day, city.latitude, city.longitude);
  if (times.kind !== 'day') return times;
  return {
    kind: 'day',
    sunrise: formatTime(new Date(times.sunrise), city.timeZone),
    sunset: formatTime(new Date(times.sunset), city.timeZone),
  };
}


/**
 * The Sun at `now` for the Weather `city`: today's sunrise, sunset and length
 * of day there, in the city's time when its time zone is known (local time
 * otherwise).
 */
export function sunView(city: WeatherCity | null, now: Date): SunView {
  if (!city) return { status: 'no-city' };
  const { latitude, longitude, timeZone } = city;
  const on = (offset: number) => {
    const { year, month, day } = cityDay(now, timeZone, offset);
    return sunTimes(year, month, day, latitude, longitude);
  };
  const today = on(0);
  if (today.kind !== 'day') return { status: 'ready', city: city.name, kind: today.kind };

  const at = now.getTime();
  const length = (today.sunset - today.sunrise) / MINUTE;
  const yesterday = on(-1);
  const difference = yesterday.kind === 'day' ? Math.round(length - (yesterday.sunset - yesterday.sunrise) / MINUTE) : 0;
  const change =
    difference === 0 ? 'Same as yesterday' : `${formatDuration(difference)} ${difference > 0 ? 'longer' : 'shorter'} than yesterday`;

  let next: string;
  if (at < today.sunrise) next = `Sunrise in ${formatDuration((today.sunrise - at) / MINUTE)}`;
  else if (at < today.sunset) next = `Sunset in ${formatDuration((today.sunset - at) / MINUTE)}`;
  else {
    const tomorrow = on(1);
    next = tomorrow.kind === 'day' ? `Sunrise tomorrow at ${formatTime(new Date(tomorrow.sunrise), timeZone)}` : '';
  }

  return {
    status: 'ready',
    city: city.name,
    kind: 'day',
    sunrise: formatTime(new Date(today.sunrise), timeZone),
    sunset: formatTime(new Date(today.sunset), timeZone),
    dayLength: formatDuration(length),
    change,
    progress: (at - today.sunrise) / (today.sunset - today.sunrise),
    next,
  };
}
