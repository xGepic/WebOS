import { daysFrom, relativeDayLabel } from '../time/calendar';

/**
 * The Moon's phases, computed locally: no network. Phase times follow Jean
 * Meeus, Astronomical Algorithms (2nd ed.), chapter 49, without the small
 * planetary terms, which keeps them within a few minutes.
 */

export type MoonPhase =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

/** What the Moon Widget shows. */
export interface MoonView {
  phase: MoonPhase;
  /** e.g. "Waxing gibbous" */
  name: string;
  /** How much of the disc is lit, 0–1. */
  illumination: number;
  /** How far through the cycle from new moon the Moon is, 0–1: 0.5 is full. Draws the disc. */
  age: number;
  /** Whether it is seen from the southern hemisphere, where the lit side is the other way round. */
  southern: boolean;
  nextFull: MoonEvent;
  nextNew: MoonEvent;
}

/** When the next full or new moon is, from today. */
export interface MoonEvent {
  /** When it is (epoch milliseconds). */
  at: number;
  /** e.g. "Tue, Nov 24" */
  label: string;
  /** "Today", "Tomorrow" or "in 12 days" */
  relative: string;
}

const SYNODIC_MONTH = 29.530588861;
const UNIX_EPOCH_JD = 2440587.5;
const DAY_MS = 86_400_000;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

const toJulianDay = (ms: number) => ms / DAY_MS + UNIX_EPOCH_JD;
const fromJulianDay = (jd: number) => (jd - UNIX_EPOCH_JD) * DAY_MS;

/** Which phase event `k` is, by its fraction: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
type Quarter = 0 | 0.25 | 0.5 | 0.75;

/**
 * The moment (epoch milliseconds) of the phase event numbered `k`: whole
 * numbers are new moons counted from the one of January 6, 2000, and the
 * fraction picks the quarter.
 */
export function phaseTime(k: number): number {
  const T = k / 1236.85;
  const jde = 2451550.09766 + SYNODIC_MONTH * k + 0.00015437 * T ** 2 - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;
  const M = rad(2.5534 + 29.1053567 * k - 0.0000014 * T ** 2 - 0.00000011 * T ** 3);
  const Mp = rad(201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4);
  const F = rad(160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4);
  const Om = rad(124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3);
  const sin = Math.sin;
  const quarter = (((k % 1) + 1) % 1) as Quarter;
  let correction: number;
  if (quarter === 0 || quarter === 0.5) {
    const [a, b, c, d, e] = quarter === 0 ? [-0.4072, 0.17241, 0.01608, 0.01039, 0.00739] : [-0.40614, 0.17302, 0.01614, 0.01043, 0.00734];
    correction =
      a * sin(Mp) +
      b * E * sin(M) +
      c * sin(2 * Mp) +
      d * sin(2 * F) +
      e * E * sin(Mp - M) -
      0.00514 * E * sin(Mp + M) +
      0.00208 * E * E * sin(2 * M) -
      0.00111 * sin(Mp - 2 * F) -
      0.00057 * sin(Mp + 2 * F) +
      0.00056 * E * sin(2 * Mp + M) -
      0.00042 * sin(3 * Mp) +
      0.00042 * E * sin(M + 2 * F) +
      0.00038 * E * sin(M - 2 * F) -
      0.00024 * E * sin(2 * Mp - M) -
      0.00017 * sin(Om);
  } else {
    correction =
      -0.62801 * sin(Mp) +
      0.17172 * E * sin(M) -
      0.01183 * E * sin(Mp + M) +
      0.00862 * sin(2 * Mp) +
      0.00804 * sin(2 * F) +
      0.00454 * E * sin(Mp - M) +
      0.00204 * E * E * sin(2 * M) -
      0.0018 * sin(Mp - 2 * F) -
      0.0007 * sin(Mp + 2 * F) -
      0.0004 * sin(3 * Mp) -
      0.00034 * E * sin(2 * Mp - M) +
      0.00032 * E * sin(M + 2 * F) +
      0.00032 * E * sin(M - 2 * F) -
      0.00028 * E * E * sin(Mp + 2 * M) +
      0.00027 * E * sin(2 * Mp + M) -
      0.00017 * sin(Om);
    const cos = Math.cos;
    const W = 0.00306 - 0.00038 * E * cos(M) + 0.00026 * cos(Mp) - 0.00002 * cos(Mp - M) + 0.00002 * cos(Mp + M) + 0.00002 * cos(2 * F);
    correction += quarter === 0.25 ? W : -W;
  }
  return fromJulianDay(jde + correction);
}

/** The phase events around `at`, in order: from the last new moon before it to the one after the next. */
function eventsAround(at: number): { k: number; time: number }[] {
  const estimate = Math.floor((toJulianDay(at) - 2451550.09766) / SYNODIC_MONTH);
  const events: { k: number; time: number }[] = [];
  for (let k = estimate - 1; k <= estimate + 2; k += 0.25) events.push({ k, time: phaseTime(k) });
  return events;
}

const PHASE_NAMES: Record<MoonPhase, string> = {
  new: 'New moon',
  'waxing-crescent': 'Waxing crescent',
  'first-quarter': 'First quarter',
  'waxing-gibbous': 'Waxing gibbous',
  full: 'Full moon',
  'waning-gibbous': 'Waning gibbous',
  'last-quarter': 'Last quarter',
  'waning-crescent': 'Waning crescent',
};

/** The principal phase each quarter of the cycle is named after, and the phase that follows it. */
const PRINCIPAL: Record<Quarter, [MoonPhase, MoonPhase]> = {
  0: ['new', 'waxing-crescent'],
  0.25: ['first-quarter', 'waxing-gibbous'],
  0.5: ['full', 'waning-gibbous'],
  0.75: ['last-quarter', 'waning-crescent'],
};

function describeEvent(time: number, now: Date): MoonEvent {
  const day = new Date(time);
  return {
    at: time,
    label: day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    relative: relativeDayLabel(daysFrom(now, day)),
  };
}

/**
 * The Moon at `now`. As in almanacs, the day a principal phase falls on
 * (new, first quarter, full, last quarter; in local time) is named after it,
 * and the days between after the phase in between. `latitude` (of the
 * Weather city) says which hemisphere it is seen from; north without one.
 */
export function moonView(now: Date, latitude?: number): MoonView {
  const at = now.getTime();
  const events = eventsAround(at);
  const previous = events.filter((event) => event.time <= at).at(-1)!;
  const quarter = (((previous.k % 1) + 1) % 1) as Quarter;
  const today = events.find((event) => daysFrom(now, new Date(event.time)) === 0);
  const phase = today ? PRINCIPAL[(((today.k % 1) + 1) % 1) as Quarter][0] : PRINCIPAL[quarter][1];

  const nextNew = events.find((event) => event.k % 1 === 0 && event.time > at)!;
  const nextFull = events.find((event) => Math.abs(event.k % 1) === 0.5 && event.time > at)!;
  // The Moon moves faster at some points of its orbit than at others, so the quarters aren't
  // evenly spaced: interpolating between the events around `at` keeps the disc exactly half
  // lit at the quarters, full at full moon, and dark at new moon.
  const next = events[events.indexOf(previous) + 1];
  const age = quarter + 0.25 * ((at - previous.time) / (next.time - previous.time));
  return {
    phase,
    name: PHASE_NAMES[phase],
    illumination: (1 - Math.cos(2 * Math.PI * age)) / 2,
    age,
    southern: (latitude ?? 0) < 0,
    nextFull: describeEvent(nextFull.time, now),
    nextNew: describeEvent(nextNew.time, now),
  };
}
