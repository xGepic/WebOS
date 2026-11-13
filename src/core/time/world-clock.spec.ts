import { createWebOS, type WeatherCity } from '../index';
import { createMemoryStorage, createTestClock, createTestFetch } from '../testing';

// Tests run in Vienna's time zone (see vitest.config.mts): on Nov 12, 2026 that is UTC+1.
const city = (name: string, timeZone?: string, country = ''): WeatherCity => ({
  name,
  region: '',
  country,
  latitude: 0,
  longitude: 0,
  ...(timeZone ? { timeZone } : {}),
});
const tokyo = city('Tokyo', 'Asia/Tokyo', 'Japan');
const newYork = city('New York', 'America/New_York', 'United States');
const kolkata = city('Kolkata', 'Asia/Kolkata', 'India');
const vienna = city('Vienna', 'Europe/Vienna', 'Austria');

async function setUp({ at = new Date(2026, 10, 12, 9, 0), storage = createMemoryStorage() } = {}) {
  const clock = createTestClock(at);
  return { webos: await createWebOS({ storage, clock }), clock, storage };
}

describe('World Clock', () => {
  it("shows each city's time, its day, and how far it is from here", async () => {
    const { webos } = await setUp();
    for (const added of [tokyo, newYork, kolkata, vienna]) await webos.worldClock.add(added);

    expect(webos.worldClock.view().map(({ name, time, day, difference, daytime }) => ({ name, time, day, difference, daytime }))).toEqual([
      { name: 'Tokyo', time: '5:00 PM', day: 'Today', difference: '8 h ahead', daytime: true },
      { name: 'New York', time: '3:00 AM', day: 'Today', difference: '6 h behind', daytime: false },
      { name: 'Kolkata', time: '1:30 PM', day: 'Today', difference: '4 h 30 min ahead', daytime: true },
      { name: 'Vienna', time: '9:00 AM', day: 'Today', difference: 'Same time', daytime: true },
    ]);
  });

  it('says when a city is already in tomorrow or still in yesterday', async () => {
    const { webos, clock } = await setUp({ at: new Date(2026, 10, 12, 20, 0) });
    await webos.worldClock.add(tokyo);
    await webos.worldClock.add(newYork);

    expect(webos.worldClock.view().map((shown) => `${shown.time} ${shown.day}`)).toEqual(['4:00 AM Tomorrow', '2:00 PM Today']);

    clock.advance(5 * 60 * 60_000);
    expect(webos.worldClock.view().map((shown) => `${shown.time} ${shown.day}`)).toEqual(['9:00 AM Today', '7:00 PM Yesterday']);
  });

  it('follows daylight saving in each city', async () => {
    // On Mar 15, 2026, New York has moved to daylight time and Vienna hasn't yet.
    const { webos } = await setUp({ at: new Date(2026, 2, 15, 12, 0) });
    await webos.worldClock.add(newYork);

    expect(webos.worldClock.view()[0]).toMatchObject({ time: '7:00 AM', difference: '5 h behind' });
  });

  it('adds only cities with a time zone, each once, and at most six', async () => {
    const { webos } = await setUp();

    expect(await webos.worldClock.add(city('Nowhere'))).toBe(false);
    expect(await webos.worldClock.add(city('Atlantis', 'Ocean/Atlantis'))).toBe(false);
    expect(await webos.worldClock.add(tokyo)).toBe(true);
    expect(await webos.worldClock.add(tokyo)).toBe(false);
    for (const name of ['Osaka', 'Kyoto', 'Nagoya', 'Sapporo', 'Kobe']) expect(await webos.worldClock.add(city(name, 'Asia/Tokyo'))).toBe(true);
    expect(await webos.worldClock.add(newYork)).toBe(false);

    expect(webos.worldClock.view()).toHaveLength(6);
  });

  it('reorders and removes cities, and keeps them for the next tab', async () => {
    const { webos, storage } = await setUp();
    for (const added of [tokyo, newYork, kolkata]) await webos.worldClock.add(added);
    const [first, , third] = webos.worldClock.view();

    await webos.worldClock.move(third.id, 0);
    await webos.worldClock.delete(first.id);
    const nextTab = await createWebOS({ storage, clock: createTestClock(new Date(2026, 10, 12, 9, 0)) });

    expect(nextTab.worldClock.view().map((shown) => shown.name)).toEqual(['Kolkata', 'New York']);
  });

  it('finds cities with their time zone through the city search', async () => {
    const fetch = createTestFetch(() => ({
      results: [{ name: 'Tokyo', admin1: 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.69171, timezone: 'Asia/Tokyo' }],
    }));
    const webos = await createWebOS({ storage: createMemoryStorage(), clock: createTestClock(new Date(2026, 10, 12, 9, 0)), fetch });

    const [found] = await webos.weather.searchCities('Tokyo');
    expect(found.timeZone).toBe('Asia/Tokyo');
    expect(await webos.worldClock.add(found)).toBe(true);
    expect(webos.worldClock.view()).toMatchObject([{ id: expect.any(String), name: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo' }]);
  });
});
