import { formatTime, isTimeZone, wallClock } from '../format';
import { isFiniteNumber, isRecord } from '../guards';

/**
 * Weather for the Weather Widget, from Open-Meteo (free, no key). It is not a
 * Data Source: it isn't personal data and doesn't come from the user's server.
 * Only the chosen city's coordinates are sent.
 */

/** A city the user chose in Settings, with the coordinates the forecast is fetched for. */
export interface WeatherCity {
  name: string;
  /** State, province or similar; empty when the geocoder gives none. */
  region: string;
  /** Empty when the geocoder gives none. */
  country: string;
  latitude: number;
  longitude: number;
  /**
   * The city's IANA time zone, e.g. "Europe/Vienna", when the geocoder gives
   * one the browser knows. Cities chosen before webOS kept it have none.
   */
  timeZone?: string;
}

export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'showers'
  | 'thunderstorm';

/** The last forecast fetched, as stored. Temperatures are °C, as the API gives them. */
export interface WeatherReport {
  /** When it was fetched (epoch milliseconds). */
  fetchedAt: number;
  temperature: number;
  /** Today's high and low, in the city's own time zone. */
  high: number;
  low: number;
  condition: WeatherCondition;
  /** Whether the sun is up in the city, so a clear night shows a moon. */
  isDay: boolean;
  /**
   * The Forecast: today and the six days after it, in the city's own time zone.
   * Reports stored by builds before the Forecast have none, and are fetched again.
   */
  days?: ForecastDay[];
}

/** One day of the Forecast, as stored. */
export interface ForecastDay {
  /** The day in the city, as `2026-11-14`. */
  date: string;
  high: number;
  low: number;
  condition: WeatherCondition;
  /** The highest chance of rain or snow in the day, in percent, when the forecast gives one. */
  rainChance?: number;
}

/** One day of the Forecast, as the Weather Widget shows it. */
export interface ForecastDayView {
  /** As `2026-11-14`. */
  date: string;
  /** "Today", or the weekday, e.g. "Mon". */
  day: string;
  /** "Today", or the weekday in full, e.g. "Monday", for screen readers. */
  dayName: string;
  /** Whole degrees Celsius. */
  high: number;
  low: number;
  condition: WeatherCondition;
  /** The condition in words, e.g. "Rain". */
  label: string;
  /** The chance of rain or snow to the nearest 10%, when that is 20% or more; otherwise undefined. */
  rainChance?: number;
}

/** What the Weather Widget shows. */
export type WeatherView =
  | { status: 'no-city' }
  | { status: 'loading' | 'unavailable'; city: string }
  | {
      status: 'ready';
      city: string;
      /** Whole degrees Celsius. */
      temperature: number;
      high: number;
      low: number;
      condition: WeatherCondition;
      /** The condition in words, e.g. "Partly cloudy". */
      label: string;
      isDay: boolean;
      /** When the shown weather was fetched, e.g. "6:10 PM", if that was over an hour ago; otherwise undefined. */
      updatedAt?: string;
      /** The Forecast from today on, at most seven days. Empty until a report with one is fetched. */
      days: ForecastDayView[];
    };

const MINUTE = 60_000;
/** A new tab fetches the weather again once the last report is this old. */
const REFRESH_AFTER_MS = 30 * MINUTE;
/** Older than this, the Widget says when the weather it shows is from. */
const SAY_WHEN_AFTER_MS = 60 * MINUTE;
/** The most matches a city search offers. */
const MAX_CITIES = 5;
/** Days in the Forecast, today included. */
const FORECAST_DAYS = 7;
/** A smaller chance of rain or snow isn't worth showing. */
const SHOW_RAIN_FROM = 20;

const conditionLabels: Record<WeatherCondition, string> = {
  clear: 'Clear',
  'partly-cloudy': 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  snow: 'Snow',
  showers: 'Showers',
  thunderstorm: 'Thunderstorm',
};

/** The condition for a WMO weather interpretation code, as Open-Meteo reports them. */
function conditionFor(code: number): WeatherCondition {
  if (code <= 1) return 'clear';
  if (code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 80 && code <= 82) return 'showers';
  if (code >= 95 && code <= 99) return 'thunderstorm';
  return 'cloudy';
}

/** The forecast request for a city: current conditions, and the next seven days from today, in the city's time zone. */
export function forecastUrl(city: WeatherCity): string {
  const params = new URLSearchParams({
    latitude: city.latitude.toFixed(4),
    longitude: city.longitude.toFixed(4),
    current: 'temperature_2m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

/** The geocoding request that finds cities matching what the user typed. */
export function citySearchUrl(query: string): string {
  const params = new URLSearchParams({ name: query.trim(), count: String(MAX_CITIES), language: 'en', format: 'json' });
  return `https://geocoding-api.open-meteo.com/v1/search?${params}`;
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/** The report in a forecast response. Throws if the response isn't what webOS asked for. */
export function parseForecast(response: unknown, fetchedAt: number): WeatherReport {
  const current = isRecord(response) ? response['current'] : undefined;
  const daily = isRecord(response) ? response['daily'] : undefined;
  if (!isRecord(current) || !isRecord(daily)) throw new Error('The weather response is missing its forecast.');
  const temperature = current['temperature_2m'];
  const code = current['weather_code'];
  const days = parseDays(daily);
  if (!isFiniteNumber(temperature) || !isFiniteNumber(code) || days.length === 0) {
    throw new Error('The weather response has an unexpected shape.');
  }
  const [{ high, low }] = days;
  return { fetchedAt, temperature, high, low, condition: conditionFor(code), isDay: current['is_day'] !== 0, days };
}

/** The days in a forecast response's `daily` part, up to the first one it gives without a date, code, high or low. */
function parseDays(daily: Record<string, unknown>): ForecastDay[] {
  const column = (name: string) => (Array.isArray(daily[name]) ? (daily[name] as unknown[]) : []);
  const dates = column('time');
  const codes = column('weather_code');
  const highs = column('temperature_2m_max');
  const lows = column('temperature_2m_min');
  const rain = column('precipitation_probability_max');
  const days: ForecastDay[] = [];
  for (const [i, date] of dates.entries()) {
    const [code, high, low] = [codes[i], highs[i], lows[i]];
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isFiniteNumber(code) || !isFiniteNumber(high) || !isFiniteNumber(low)) break;
    days.push({ date, high, low, condition: conditionFor(code), ...(isFiniteNumber(rain[i]) ? { rainChance: rain[i] } : {}) });
  }
  return days;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Today's date in the city, as `2026-11-14`: in its own time zone if it has one the browser knows, else locally. */
function todayIn(city: WeatherCity, now: Date): string {
  let clock;
  try {
    clock = wallClock(now, city.timeZone);
  } catch {
    clock = wallClock(now);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${clock.year}-${pad(clock.month + 1)}-${pad(clock.day)}`;
}

/** The stored Forecast from the city's today on, as the Widget shows it. Days already past, in an old report, are left out. */
function forecastView(city: WeatherCity, days: readonly ForecastDay[], now: Date): ForecastDayView[] {
  const today = todayIn(city, now);
  return days
    .filter((day) => day.date >= today)
    .map((day) => {
      const [year, month, date] = day.date.split('-').map(Number);
      const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, date)).getUTCDay()];
      const rainChance = day.rainChance === undefined ? 0 : Math.round(day.rainChance / 10) * 10;
      return {
        date: day.date,
        day: day.date === today ? 'Today' : weekday.slice(0, 3),
        dayName: day.date === today ? 'Today' : weekday,
        high: Math.round(day.high),
        low: Math.round(day.low),
        condition: day.condition,
        label: conditionLabels[day.condition],
        rainChance: rainChance >= SHOW_RAIN_FROM ? rainChance : undefined,
      };
    });
}

/** The cities in a geocoding response, at most five, best match first. No results is an empty list. */
export function parseCities(response: unknown): WeatherCity[] {
  const results = isRecord(response) && Array.isArray(response['results']) ? response['results'] : [];
  return results
    .filter(isRecord)
    .filter((result) => text(result['name']) && isFiniteNumber(result['latitude']) && isFiniteNumber(result['longitude']))
    .slice(0, MAX_CITIES)
    .map((result) => ({
      name: text(result['name']),
      region: text(result['admin1']),
      country: text(result['country']),
      latitude: result['latitude'] as number,
      longitude: result['longitude'] as number,
      ...(isTimeZone(result['timezone']) ? { timeZone: result['timezone'] } : {}),
    }));
}

/** A city as Settings lists it, e.g. "Vienna, Austria" or "Vienna, Virginia, United States". */
export function describeCity(city: WeatherCity): string {
  return [city.name, city.region !== city.name ? city.region : '', city.country].filter(Boolean).join(', ');
}

export const sameCity = (a: WeatherCity | null, b: WeatherCity | null) =>
  a === b || (!!a && !!b && a.latitude === b.latitude && a.longitude === b.longitude && a.name === b.name);

/** Whether a new tab should fetch the weather again: it is 30 minutes old, or from a build before the Forecast. */
export const isDue = (report: WeatherReport | null, now: number) => !report || !report.days || now - report.fetchedAt >= REFRESH_AFTER_MS;

/** What the Widget shows for the stored city and report, and how this tab's last fetch went. */
export function weatherView(
  city: WeatherCity | null,
  report: WeatherReport | null,
  { failed, now }: { failed: boolean; now: Date },
): WeatherView {
  if (!city) return { status: 'no-city' };
  if (!report) return { status: failed ? 'unavailable' : 'loading', city: city.name };
  return {
    status: 'ready',
    city: city.name,
    temperature: Math.round(report.temperature),
    high: Math.round(report.high),
    low: Math.round(report.low),
    condition: report.condition,
    label: conditionLabels[report.condition],
    isDay: report.isDay,
    updatedAt: now.getTime() - report.fetchedAt > SAY_WHEN_AFTER_MS ? formatTime(new Date(report.fetchedAt)) : undefined,
    days: forecastView(city, report.days ?? [], now),
  };
}
