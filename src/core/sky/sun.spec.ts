import { createWebOS, type WeatherCity } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

const vienna: WeatherCity = { name: 'Vienna', region: 'Vienna', country: 'Austria', latitude: 48.20849, longitude: 16.37208 };
const tokyo: WeatherCity = {
  name: 'Tokyo',
  region: 'Tokyo',
  country: 'Japan',
  latitude: 35.6895,
  longitude: 139.69171,
  timeZone: 'Asia/Tokyo',
};
const tromso: WeatherCity = { name: 'Tromsø', region: 'Troms', country: 'Norway', latitude: 69.6489, longitude: 18.95508 };

/** The Sun at `at` (local time: Vienna's, see vitest.config.mts) for the Weather city. */
async function sunAt(at: Date, city: WeatherCity | null = vienna) {
  const clock = createTestClock(at);
  const webos = await createWebOS({ storage: createMemoryStorage(), clock });
  if (city) await webos.weather.setCity(city);
  return { webos, clock };
}

describe('the Sun Widget', () => {
  it('asks for a city without one', async () => {
    const { webos } = await sunAt(new Date(2026, 5, 21, 12, 0), null);

    expect(webos.sun.view()).toEqual({ status: 'no-city' });
  });

  it("shows today's sunrise, sunset and length of day", async () => {
    // Published times for Vienna on June 21, 2026: sunrise 4:53 AM, sunset 8:58 PM.
    const { webos } = await sunAt(new Date(2026, 5, 21, 12, 0));

    expect(webos.sun.view()).toMatchObject({
      status: 'ready',
      city: 'Vienna',
      kind: 'day',
      sunrise: '4:53 AM',
      sunset: '8:58 PM',
      dayLength: '16 h 5 min',
    });
  });

  it('says how the day compares with yesterday', async () => {
    expect((await sunAt(new Date(2026, 11, 1, 12, 0))).webos.sun.view()).toMatchObject({ change: '2 min shorter than yesterday' });
    expect((await sunAt(new Date(2026, 2, 1, 12, 0))).webos.sun.view()).toMatchObject({ change: '3 min longer than yesterday' });
  });

  it("shows a city's times in its own time zone when it is known", async () => {
    // Published times for Tokyo on June 21, 2026: sunrise 4:25 AM, sunset 7:00 PM.
    const { webos } = await sunAt(new Date(2026, 5, 21, 12, 0), tokyo);

    expect(webos.sun.view()).toMatchObject({ sunrise: '4:25 AM', sunset: '7:00 PM' });
  });

  it('says what comes next, and how far through its day the sun is', async () => {
    const { webos, clock } = await sunAt(new Date(2026, 5, 21, 3, 53));
    expect(webos.sun.view()).toMatchObject({ next: 'Sunrise in 1 h' });
    expect((webos.sun.view() as { progress: number }).progress).toBeLessThan(0);

    clock.advance(9 * 60 * 60_000);
    expect(webos.sun.view()).toMatchObject({ next: 'Sunset in 8 h 5 min' });
    expect((webos.sun.view() as { progress: number }).progress).toBeCloseTo(0.5, 1);

    clock.advance(9 * 60 * 60_000);
    expect(webos.sun.view()).toMatchObject({ next: 'Sunrise tomorrow at 4:54 AM' });
    expect((webos.sun.view() as { progress: number }).progress).toBeGreaterThan(1);
  });

  it('knows polar night and polar day', async () => {
    expect((await sunAt(new Date(2026, 11, 21, 12, 0), tromso)).webos.sun.view()).toEqual({
      status: 'ready',
      city: 'Tromsø',
      kind: 'polar-night',
    });
    expect((await sunAt(new Date(2026, 5, 21, 12, 0), tromso)).webos.sun.view()).toMatchObject({ kind: 'polar-day' });
  });
});
