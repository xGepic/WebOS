import { formatTime, isTimeZone } from './format';

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
    };

const MINUTE = 60_000;
/** A new tab fetches the weather again once the last report is this old. */
export const REFRESH_AFTER_MS = 30 * MINUTE;
/** Older than this, the Widget says when the weather it shows is from. */
const SAY_WHEN_AFTER_MS = 60 * MINUTE;
/** The most matches a city search offers. */
const MAX_CITIES = 5;

export const conditionLabels: Record<WeatherCondition, string> = {
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
export function conditionFor(code: number): WeatherCondition {
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

/** The forecast request for a city: current conditions and today's high and low, in the city's time zone. */
export function forecastUrl(city: WeatherCity): string {
  const params = new URLSearchParams({
    latitude: city.latitude.toFixed(4),
    longitude: city.longitude.toFixed(4),
    current: 'temperature_2m,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '1',
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

/** The geocoding request that finds cities matching what the user typed. */
export function citySearchUrl(query: string): string {
  const params = new URLSearchParams({ name: query.trim(), count: String(MAX_CITIES), language: 'en', format: 'json' });
  return `https://geocoding-api.open-meteo.com/v1/search?${params}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const text = (value: unknown) => (typeof value === 'string' ? value : '');

/** The report in a forecast response. Throws if the response isn't what webOS asked for. */
export function parseForecast(response: unknown, fetchedAt: number): WeatherReport {
  const current = isRecord(response) ? response['current'] : undefined;
  const daily = isRecord(response) ? response['daily'] : undefined;
  const first = (list: unknown) => (Array.isArray(list) ? list[0] : undefined);
  if (!isRecord(current) || !isRecord(daily)) throw new Error('The weather response is missing its forecast.');
  const temperature = current['temperature_2m'];
  const code = current['weather_code'];
  const high = first(daily['temperature_2m_max']);
  const low = first(daily['temperature_2m_min']);
  if (!isNumber(temperature) || !isNumber(code) || !isNumber(high) || !isNumber(low)) {
    throw new Error('The weather response has an unexpected shape.');
  }
  return { fetchedAt, temperature, high, low, condition: conditionFor(code), isDay: current['is_day'] !== 0 };
}

/** The cities in a geocoding response, at most five, best match first. No results is an empty list. */
export function parseCities(response: unknown): WeatherCity[] {
  const results = isRecord(response) && Array.isArray(response['results']) ? response['results'] : [];
  return results
    .filter(isRecord)
    .filter((result) => text(result['name']) && isNumber(result['latitude']) && isNumber(result['longitude']))
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

/** Whether a new tab should fetch the weather again. */
export const isDue = (report: WeatherReport | null, now: number) => !report || now - report.fetchedAt >= REFRESH_AFTER_MS;

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
  };
}
