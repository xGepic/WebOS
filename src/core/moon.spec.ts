import { createWebOS, type WeatherCity } from './index';
import { phaseTime } from './moon';
import { createMemoryStorage, createTestClock } from './testing';

const MINUTE = 60_000;

/** The Moon on a day, seen from Vienna's time zone (see vitest.config.mts), from a Weather city at `latitude` if given. */
async function moonAt(at: Date, latitude?: number) {
  const city: WeatherCity | null = latitude === undefined ? null : { name: 'Somewhere', region: '', country: '', latitude, longitude: 0 };
  const storage = createMemoryStorage();
  const webos = await createWebOS({ storage, clock: createTestClock(at) });
  if (city) await webos.weather.setCity(city);
  return webos.moon.view();
}

describe('Moon phase times', () => {
  it.each([
    // Meeus, Astronomical Algorithms, example 49.a: the new moon of February 1977 (k = -283).
    ['the new moon of Feb 18, 1977', -283, Date.UTC(1977, 1, 18, 3, 37, 42)],
    // The total solar eclipse of April 8, 2024.
    ['the new moon of Apr 8, 2024', 300, Date.UTC(2024, 3, 8, 18, 21)],
    ['the full moon of Jan 25, 2024', 297.5, Date.UTC(2024, 0, 25, 17, 54)],
    ['the first quarter of Jan 18, 2024', 297.25, Date.UTC(2024, 0, 18, 3, 52)],
    ['the last quarter of Feb 2, 2024', 297.75, Date.UTC(2024, 1, 2, 23, 18)],
  ])('puts %s within a few minutes', (_, k, expected) => {
    expect(Math.abs(phaseTime(k) - expected)).toBeLessThan(3 * MINUTE);
  });
});

describe('the Moon Widget', () => {
  it('names the day of a principal phase after it, in local time', async () => {
    expect((await moonAt(new Date(2024, 3, 8, 9, 0))).name).toBe('New moon');
    expect((await moonAt(new Date(2024, 0, 25, 23, 0))).name).toBe('Full moon');
    expect((await moonAt(new Date(2024, 0, 18, 6, 0))).name).toBe('First quarter');
    // The last quarter falls at 00:18 on Feb 3 in Vienna, not Feb 2.
    expect((await moonAt(new Date(2024, 1, 2, 12, 0))).name).toBe('Waning gibbous');
    expect((await moonAt(new Date(2024, 1, 3, 12, 0))).name).toBe('Last quarter');
  });

  it('names the days in between after the phase in between', async () => {
    expect((await moonAt(new Date(2024, 0, 14, 12, 0))).phase).toBe('waxing-crescent');
    expect((await moonAt(new Date(2024, 0, 21, 12, 0))).phase).toBe('waxing-gibbous');
    expect((await moonAt(new Date(2024, 0, 29, 12, 0))).phase).toBe('waning-gibbous');
    expect((await moonAt(new Date(2024, 1, 6, 12, 0))).phase).toBe('waning-crescent');
  });

  it('says how much of it is lit', async () => {
    expect((await moonAt(new Date(2024, 0, 25, 18, 54))).illumination).toBeGreaterThan(0.99);
    expect((await moonAt(new Date(2024, 3, 8, 20, 21))).illumination).toBeLessThan(0.01);
    const quarter = await moonAt(new Date(2024, 0, 18, 4, 52));
    expect(quarter.illumination).toBeCloseTo(0.5, 1);
    expect(quarter.age).toBeCloseTo(0.25, 1);
  });

  it('says when the next full and new moons are', async () => {
    const moon = await moonAt(new Date(2024, 2, 20, 12, 0));

    expect(moon.nextFull).toMatchObject({ label: 'Mon, Mar 25', relative: 'in 5 days' });
    expect(moon.nextNew).toMatchObject({ label: 'Mon, Apr 8', relative: 'in 19 days' });
  });

  it('is seen from the southern hemisphere when the Weather city is there', async () => {
    expect((await moonAt(new Date(2024, 0, 20, 12, 0))).southern).toBe(false);
    expect((await moonAt(new Date(2024, 0, 20, 12, 0), 48.2)).southern).toBe(false);
    expect((await moonAt(new Date(2024, 0, 20, 12, 0), -33.87)).southern).toBe(true);
  });

  it('moves on with the clock', async () => {
    const clock = createTestClock(new Date(2024, 0, 24, 12, 0));
    const webos = await createWebOS({ storage: createMemoryStorage(), clock });
    expect(webos.moon.view().phase).toBe('waxing-gibbous');

    clock.advance(24 * 60 * MINUTE);

    expect(webos.moon.view().phase).toBe('full');
  });
});
