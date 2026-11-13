import type { Fetch } from '../edges';
import { createRefresher } from '../refresher';
import type { Store } from '../store';
import * as moon from './moon';
import * as sun from './sun';
import * as weather from './weather';

export interface SkyApi {
  /**
   * The Weather Widget's weather for the city chosen in Settings, from
   * Open-Meteo. The last forecast is stored, so a new tab shows it at once; a
   * new tab fetches it again once it is 30 minutes old.
   */
  readonly weather: {
    /** The chosen city, or null before one is chosen. */
    city(): weather.WeatherCity | null;
    /** What the Weather Widget shows. */
    view(): weather.WeatherView;
    /** Up to five cities matching `query`, best first. Rejects if the search can't be made. */
    searchCities(query: string): Promise<weather.WeatherCity[]>;
    /** Chooses the city (or none, with null), drops the old city's weather, and fetches the new city's. */
    setCity(city: weather.WeatherCity | null): Promise<void>;
    /**
     * Fetches the weather if the stored forecast is 30 minutes old or there is
     * none, unless a fetch is already under way. Resolves when it is done; a
     * failed fetch keeps the last forecast and doesn't reject.
     */
    refresh(): Promise<void>;
  };
  /** Sunrise and sunset in the Weather city, computed locally. */
  readonly sun: {
    view(): sun.SunView;
  };
  /** The Moon tonight, computed locally. Seen from the Weather city's hemisphere (north without one). */
  readonly moon: {
    view(): moon.MoonView;
  };
}

/** The Weather, Sun and Moon Widgets, all for the city chosen in Settings. The Desktop loading fetches the weather if it is due. */
export function createSky(store: Store, fetch: Fetch | undefined): SkyApi {
  const { clock } = store;
  const state = store.state;

  const forecast = createRefresher(store, {
    source: (current) => (fetch ? (current.weather.city ?? undefined) : undefined),
    same: (a, b) => weather.sameCity(a, b),
    isDue: (current, now) => weather.isDue(current.weather.report, now),
    load: async (city) => weather.parseForecast(await fetch!.json(weather.forecastUrl(city)), clock.now().getTime()),
    store: (current, report) => ({ ...current, weather: { ...current.weather, report } }),
    problemOf: () => 'failed' as const,
  });
  void forecast.refresh();

  return {
    weather: {
      city: () => state().weather.city,
      view: () =>
        weather.weatherView(state().weather.city, state().weather.report, {
          failed: forecast.problem() !== undefined,
          now: clock.now(),
        }),
      async searchCities(query) {
        if (!query.trim() || !fetch) return [];
        return weather.parseCities(await fetch.json(weather.citySearchUrl(query)));
      },
      async setCity(city) {
        forecast.forget();
        await store.commit({ ...state(), weather: { city, report: null } });
        void forecast.refresh(true);
      },
      refresh: () => forecast.refresh(),
    },
    sun: {
      view: () => sun.sunView(state().weather.city, clock.now()),
    },
    moon: {
      view: () => moon.moonView(clock.now(), state().weather.city?.latitude),
    },
  };
}
