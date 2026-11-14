import { createWebOS, type WeatherCity } from '../index';
import { createMemoryStorage, createTestClock, createTestFetch, type TestFetch } from '../testing';

const MINUTE = 60_000;
const vienna: WeatherCity = { name: 'Vienna', region: 'Vienna', country: 'Austria', latitude: 48.20849, longitude: 16.37208 };
const oslo: WeatherCity = { name: 'Oslo', region: 'Oslo', country: 'Norway', latitude: 59.91273, longitude: 10.74609 };

const DAY = 24 * 60 * MINUTE;

/** The six days after today (Thursday 12 November) in a forecast response: date, weather code, high, low, chance of rain. */
const laterDays: [string, number, number, number, number | null][] = [
  ['2026-11-13', 61, 10.4, 5.6, 84],
  ['2026-11-14', 2, 12.5, 4.1, 14],
  ['2026-11-15', 0, 13.2, 3.8, 0],
  ['2026-11-16', 3, 9.6, 2.5, 25],
  ['2026-11-17', 71, 4.4, -1.2, 66],
  ['2026-11-18', 45, 6.1, 0.4, null],
];

/** An Open-Meteo forecast response: now, and seven days from today, which has the given code, high and low. */
const forecast = ({ temperature = 11.6, code = 3, isDay = 1, high = 14.8, low = 7.2 } = {}) => ({
  current: { temperature_2m: temperature, weather_code: code, is_day: isDay },
  daily: {
    time: ['2026-11-12', ...laterDays.map((day) => day[0])],
    weather_code: [code, ...laterDays.map((day) => day[1])],
    temperature_2m_max: [high, ...laterDays.map((day) => day[2])],
    temperature_2m_min: [low, ...laterDays.map((day) => day[3])],
    precipitation_probability_max: [5, ...laterDays.map((day) => day[4])],
  },
});

/** An Open-Meteo geocoding response. */
const places = (...results: Record<string, unknown>[]) => ({ results });

/** Answers forecasts with `respond`, and geocoding with Vienna, Austria and Vienna, Virginia. */
function openMeteo(respond: (url: URL) => unknown = () => forecast()): TestFetch {
  return createTestFetch((url) => {
    if (url.hostname === 'geocoding-api.open-meteo.com') {
      return places(
        { name: 'Vienna', admin1: 'Vienna', country: 'Austria', latitude: 48.20849, longitude: 16.37208 },
        { name: 'Vienna', admin1: 'Virginia', country: 'United States', latitude: 38.90122, longitude: -77.26526 },
      );
    }
    return respond(url);
  });
}

const failing = () => {
  throw new Error('offline');
};

async function setUp({ fetch = openMeteo(), storage = createMemoryStorage(), clock = createTestClock(new Date(2026, 10, 12, 18, 0)) } = {}) {
  const webos = await createWebOS({ storage, clock, fetch });
  return { webos, fetch, storage, clock };
}

const forecasts = (fetch: TestFetch) => fetch.requests.filter((url) => url.hostname === 'api.open-meteo.com');

describe('choosing a city', () => {
  it('offers up to five matching cities, with region and country to tell them apart', async () => {
    const { webos, fetch } = await setUp();

    const cities = await webos.weather.searchCities('  Vienna ');

    expect(cities).toEqual([
      { name: 'Vienna', region: 'Vienna', country: 'Austria', latitude: 48.20849, longitude: 16.37208 },
      { name: 'Vienna', region: 'Virginia', country: 'United States', latitude: 38.90122, longitude: -77.26526 },
    ]);
    expect(fetch.requests[0].searchParams.get('name')).toBe('Vienna');
    expect(fetch.requests[0].searchParams.get('count')).toBe('5');
  });

  it('finds nothing, without asking, for a blank search', async () => {
    const { webos, fetch } = await setUp();

    expect(await webos.weather.searchCities('   ')).toEqual([]);
    expect(fetch.requests).toEqual([]);
  });

  it('finds nothing when the geocoder has no results, and keeps only the first five', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ name: `Springfield ${i}`, country: 'United States', latitude: i, longitude: i }));
    const { webos } = await setUp({
      fetch: createTestFetch((url) => (url.searchParams.get('name') === 'Nowhere' ? {} : places(...many))),
    });

    expect(await webos.weather.searchCities('Nowhere')).toEqual([]);
    expect((await webos.weather.searchCities('Springfield')).map((city) => city.name)).toEqual([
      'Springfield 0',
      'Springfield 1',
      'Springfield 2',
      'Springfield 3',
      'Springfield 4',
    ]);
  });

  it('rejects a search that cannot be made, so Settings can say so', async () => {
    const { webos } = await setUp({ fetch: createTestFetch(failing) });

    await expect(webos.weather.searchCities('Vienna')).rejects.toThrow();
  });
});

describe('the Weather Widget', () => {
  it('asks for a city before one is chosen, and fetches nothing', async () => {
    const { webos, fetch } = await setUp();
    await webos.weather.refresh();

    expect(webos.weather.view()).toEqual({ status: 'no-city' });
    expect(fetch.requests).toEqual([]);
  });

  it("shows the chosen city's weather in whole degrees Celsius, with today's high and low", async () => {
    const { webos, fetch } = await setUp();

    await webos.weather.setCity(vienna);
    expect(webos.weather.view()).toEqual({ status: 'loading', city: 'Vienna' });
    await webos.weather.refresh();

    expect(webos.weather.view()).toEqual({
      status: 'ready',
      city: 'Vienna',
      temperature: 12,
      high: 15,
      low: 7,
      condition: 'cloudy',
      label: 'Cloudy',
      isDay: true,
      updatedAt: undefined,
      days: expect.any(Array),
    });
    const [request] = forecasts(fetch);
    expect(request.searchParams.get('latitude')).toBe('48.2085');
    expect(request.searchParams.get('longitude')).toBe('16.3721');
    expect(request.searchParams.get('timezone')).toBe('auto');
  });

  it('forecasts today and the six days after it, with the chance of rain or snow when it is worth showing', async () => {
    const { webos, fetch } = await setUp();

    await webos.weather.setCity(vienna);
    await webos.weather.refresh();

    expect(webos.weather.view()).toMatchObject({
      days: [
        { date: '2026-11-12', day: 'Today', dayName: 'Today', high: 15, low: 7, condition: 'cloudy', label: 'Cloudy', rainChance: undefined },
        { date: '2026-11-13', day: 'Fri', dayName: 'Friday', high: 10, low: 6, condition: 'rain', label: 'Rain', rainChance: 80 },
        { date: '2026-11-14', day: 'Sat', high: 13, low: 4, condition: 'partly-cloudy', rainChance: undefined },
        { date: '2026-11-15', day: 'Sun', high: 13, low: 4, condition: 'clear', rainChance: undefined },
        { date: '2026-11-16', day: 'Mon', high: 10, low: 3, condition: 'cloudy', rainChance: 30 },
        { date: '2026-11-17', day: 'Tue', high: 4, low: -1, condition: 'snow', rainChance: 70 },
        { date: '2026-11-18', day: 'Wed', high: 6, low: 0, condition: 'fog', rainChance: undefined },
      ],
    });
    const [request] = forecasts(fetch);
    expect(request.searchParams.get('daily')).toContain('precipitation_probability_max');
    expect(request.searchParams.get('forecast_days')).toBe('7');
  });

  it("starts the Forecast on today in the city's own time zone", async () => {
    const tokyo: WeatherCity = { name: 'Tokyo', region: 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.69171, timeZone: 'Asia/Tokyo' };
    const { webos } = await setUp();

    // 6 PM in Vienna is already 2 AM on Friday in Tokyo.
    await webos.weather.setCity(tokyo);
    await webos.weather.refresh();

    const view = webos.weather.view();
    expect(view.status === 'ready' && view.days.map((day) => day.day)).toEqual(['Today', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed']);
  });

  it('stops the Forecast at the first day the response gives without its numbers', async () => {
    const response = forecast();
    response.daily.temperature_2m_max[3] = null as unknown as number;
    const { webos } = await setUp({ fetch: openMeteo(() => response) });

    await webos.weather.setCity(vienna);
    await webos.weather.refresh();

    const view = webos.weather.view();
    expect(view.status === 'ready' && view.days.map((day) => day.day)).toEqual(['Today', 'Fri', 'Sat']);
  });

  it.each([
    [0, 'Clear'],
    [1, 'Clear'],
    [2, 'Partly cloudy'],
    [3, 'Cloudy'],
    [45, 'Fog'],
    [53, 'Drizzle'],
    [63, 'Rain'],
    [66, 'Rain'],
    [73, 'Snow'],
    [86, 'Snow'],
    [81, 'Showers'],
    [95, 'Thunderstorm'],
  ])('describes weather code %i as "%s"', async (code, label) => {
    const { webos } = await setUp({ fetch: openMeteo(() => forecast({ code })) });

    await webos.weather.setCity(vienna);
    await webos.weather.refresh();

    expect(webos.weather.view()).toMatchObject({ status: 'ready', label });
  });

  it('knows when the sun is down, so a clear night can show a moon', async () => {
    const { webos } = await setUp({ fetch: openMeteo(() => forecast({ code: 0, isDay: 0 })) });

    await webos.weather.setCity(vienna);
    await webos.weather.refresh();

    expect(webos.weather.view()).toMatchObject({ condition: 'clear', isDay: false });
  });
});

describe('keeping the weather fresh', () => {
  it('shows the last weather at once in a new tab, and only fetches again once it is 30 minutes old', async () => {
    const storage = createMemoryStorage();
    const clock = createTestClock(new Date(2026, 10, 12, 18, 0));
    const first = await setUp({ storage, clock });
    await first.webos.weather.setCity(vienna);
    await first.webos.weather.refresh();

    clock.advance(29 * MINUTE);
    // The new forecast is held back until the test lets it through, to see what shows meanwhile.
    let letThrough: () => void = () => {};
    const gate = new Promise<void>((resolve) => (letThrough = resolve));
    const fetch = openMeteo(() => gate.then(() => forecast({ temperature: 9 })));
    const nextTab = await setUp({ storage, clock, fetch });
    await nextTab.webos.weather.refresh();
    expect(nextTab.webos.weather.view()).toMatchObject({ status: 'ready', temperature: 12 });
    expect(forecasts(fetch)).toHaveLength(0);

    clock.advance(1 * MINUTE);
    const later = await setUp({ storage, clock, fetch });
    expect(later.webos.weather.view()).toMatchObject({ status: 'ready', temperature: 12 });
    letThrough();
    await later.webos.weather.refresh();
    expect(later.webos.weather.view()).toMatchObject({ temperature: 9 });
    expect(forecasts(fetch)).toHaveLength(1);
  });

  it('leaves out the days already past when it can only show an old Forecast', async () => {
    const storage = createMemoryStorage();
    const clock = createTestClock(new Date(2026, 10, 12, 18, 0));
    const first = await setUp({ storage, clock });
    await first.webos.weather.setCity(vienna);
    await first.webos.weather.refresh();

    clock.advance(2 * DAY);
    const offline = await setUp({ storage, clock, fetch: createTestFetch(failing) });
    await offline.webos.weather.refresh();

    const view = offline.webos.weather.view();
    expect(view.status === 'ready' && view.days.map((day) => day.day)).toEqual(['Today', 'Sun', 'Mon', 'Tue', 'Wed']);
  });

  it('fetches again, however fresh, weather stored before webOS had the Forecast', async () => {
    const clock = createTestClock(new Date(2026, 10, 12, 18, 0));
    const first = await setUp({ clock });
    await first.webos.weather.setCity(vienna);
    await first.webos.weather.refresh();
    const document = JSON.parse(first.webos.backup.export().text);
    document.weather.report = { fetchedAt: clock.now().getTime(), temperature: 11.6, high: 14.8, low: 7.2, condition: 'cloudy', isDay: true };

    const older = await setUp({ clock, storage: createMemoryStorage(document) });
    expect(older.webos.weather.view()).toMatchObject({ status: 'ready', temperature: 12, days: [] });
    await older.webos.weather.refresh();

    expect(forecasts(older.fetch)).toHaveLength(1);
    expect(older.webos.weather.view()).toMatchObject({ status: 'ready', days: expect.arrayContaining([expect.objectContaining({ day: 'Today' })]) });
  });

  it('fetches once when asked again while a fetch is under way', async () => {
    const { webos, fetch } = await setUp();
    await webos.weather.setCity(vienna);

    await Promise.all([webos.weather.refresh(), webos.weather.refresh()]);

    expect(forecasts(fetch)).toHaveLength(1);
  });

  it('keeps showing the last weather when a fetch fails, saying when it is from once it is over an hour old', async () => {
    const storage = createMemoryStorage();
    const clock = createTestClock(new Date(2026, 10, 12, 18, 0));
    const first = await setUp({ storage, clock });
    await first.webos.weather.setCity(vienna);
    await first.webos.weather.refresh();

    clock.advance(45 * MINUTE);
    const offline = await setUp({ storage, clock, fetch: createTestFetch(failing) });
    await offline.webos.weather.refresh();
    expect(offline.webos.weather.view()).toMatchObject({ status: 'ready', temperature: 12, updatedAt: undefined });

    clock.advance(30 * MINUTE);
    expect(offline.webos.weather.view()).toMatchObject({ status: 'ready', temperature: 12, updatedAt: '6:00 PM' });
  });

  it('says the weather is unavailable when there is none yet and fetching it fails', async () => {
    const { webos } = await setUp({ fetch: openMeteo(failing) });

    await webos.weather.setCity(vienna);
    await webos.weather.refresh();

    expect(webos.weather.view()).toEqual({ status: 'unavailable', city: 'Vienna' });
  });

  it("treats a response it can't read as a failed fetch", async () => {
    const { webos } = await setUp({ fetch: openMeteo(() => ({ current: {} })) });

    await webos.weather.setCity(vienna);
    await webos.weather.refresh();

    expect(webos.weather.view()).toEqual({ status: 'unavailable', city: 'Vienna' });
  });

  it("drops the old city's weather when the city changes, and fetches the new one's", async () => {
    const fetch = openMeteo((url) => forecast({ temperature: url.searchParams.get('latitude') === '59.9127' ? 3 : 12 }));
    const { webos } = await setUp({ fetch });
    await webos.weather.setCity(vienna);
    await webos.weather.refresh();

    await webos.weather.setCity(oslo);
    expect(webos.weather.view()).toEqual({ status: 'loading', city: 'Oslo' });
    await webos.weather.refresh();

    expect(webos.weather.view()).toMatchObject({ status: 'ready', city: 'Oslo', temperature: 3 });
  });

  it('ignores weather that arrives for a city no longer chosen', async () => {
    let answer: (value: unknown) => void = () => {};
    const fetch = createTestFetch((url) =>
      url.searchParams.get('latitude') === '48.2085' ? new Promise((resolve) => (answer = resolve)) : forecast({ temperature: 3 }),
    );
    const { webos } = await setUp({ fetch });
    await webos.weather.setCity(vienna);
    const slowVienna = webos.weather.refresh();

    await webos.weather.setCity(oslo);
    answer(forecast({ temperature: 25 }));
    await slowVienna;

    // Oslo's weather was fetched as soon as Vienna's arrived, without waiting for another tab.
    expect(forecasts(fetch).map((url) => url.searchParams.get('latitude'))).toEqual(['48.2085', '59.9127']);
    expect(webos.weather.view()).toMatchObject({ city: 'Oslo', temperature: 3 });
  });

  it('forgets the city, and its weather, when the city is removed', async () => {
    const { webos } = await setUp();
    await webos.weather.setCity(vienna);
    await webos.weather.refresh();

    await webos.weather.setCity(null);

    expect(webos.weather.city()).toBeNull();
    expect(webos.weather.view()).toEqual({ status: 'no-city' });
  });

  it('shows weather another tab fetched', async () => {
    const storage = createMemoryStorage();
    const { webos } = await setUp({ storage });
    const other = await setUp({ storage: storage.openTab() });

    await other.webos.weather.setCity(vienna);
    await other.webos.weather.refresh();

    expect(webos.weather.view()).toMatchObject({ status: 'ready', city: 'Vienna', temperature: 12 });
  });
});

describe('weather in a backup', () => {
  it('keeps the city but leaves out the cached weather, which an import drops too', async () => {
    const { webos } = await setUp();
    await webos.weather.setCity(vienna);
    await webos.weather.refresh();

    const file = webos.backup.export();
    expect(JSON.parse(file.text).weather).toEqual({ city: vienna, report: null });

    const restored = await setUp({ fetch: createTestFetch(failing) });
    await restored.webos.backup.import(file.text.replace('"report": null', '"report": { "fetchedAt": 0 }'));
    expect(restored.webos.weather.city()).toEqual(vienna);
    expect(restored.webos.weather.view()).toMatchObject({ status: 'loading', city: 'Vienna' });
  });

  it('refuses a backup whose city is missing its coordinates', async () => {
    const { webos } = await setUp();
    const file = JSON.parse(webos.backup.export().text);
    file.weather.city = { name: 'Vienna', region: '', country: 'Austria' };

    await expect(webos.backup.import(JSON.stringify(file))).rejects.toThrow(/damaged/);
  });
});
