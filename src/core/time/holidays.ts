import { daysFrom, isoDate } from './calendar';

/** A public holiday in Austria: its day as `2026-12-25`, and its name. */
export interface Holiday {
  date: string;
  name: string;
}

/** Easter Sunday in the Gregorian calendar, by the anonymous (Meeus/Jones/Butcher) algorithm. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Austria's 13 public holidays in `year`, from its Arbeitsruhegesetz, in date order. */
export function holidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const fixed = (month: number, day: number) => new Date(year, month - 1, day);
  const fromEaster = (days: number) => new Date(year, easter.getMonth(), easter.getDate() + days);
  const days: [Date, string][] = [
    [fixed(1, 1), 'New Year’s Day'],
    [fixed(1, 6), 'Epiphany'],
    [fromEaster(1), 'Easter Monday'],
    [fixed(5, 1), 'Labour Day'],
    [fromEaster(39), 'Ascension Day'],
    [fromEaster(50), 'Whit Monday'],
    [fromEaster(60), 'Corpus Christi'],
    [fixed(8, 15), 'Assumption Day'],
    [fixed(10, 26), 'National Day'],
    [fixed(11, 1), 'All Saints’ Day'],
    [fixed(12, 8), 'Immaculate Conception'],
    [fixed(12, 25), 'Christmas Day'],
    [fixed(12, 26), 'St. Stephen’s Day'],
  ];
  return days.map(([date, name]) => ({ date: isoDate(date), name })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * A bridge day: a working day with a day off (a weekend day or a public
 * holiday) on each side, so taking it off joins them into one longer break.
 */
export interface BridgeDay {
  date: string;
  /** The days off in a row if it is taken off, itself included. */
  days: number;
  /** The first and last of those days. */
  from: string;
  to: string;
}

const bridgeDaysByYear = new Map<number, BridgeDay[]>();

/** The bridge days in `year`, in date order. A day off in the year before or after counts too. */
export function bridgeDays(year: number): BridgeDay[] {
  const cached = bridgeDaysByYear.get(year);
  if (cached) return cached;
  const holidayDates = new Set([year - 1, year, year + 1].flatMap((y) => holidays(y).map((holiday) => holiday.date)));
  const dayOff = (date: Date) => date.getDay() === 0 || date.getDay() === 6 || holidayDates.has(isoDate(date));
  /** The day `days` days after `date`, built from its parts so daylight saving can't shift it. */
  const shift = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

  const found: BridgeDay[] = [];
  for (let date = new Date(year, 0, 1); date.getFullYear() === year; date = shift(date, 1)) {
    if (dayOff(date) || !dayOff(shift(date, -1)) || !dayOff(shift(date, 1))) continue;
    let first = shift(date, -1);
    while (dayOff(shift(first, -1))) first = shift(first, -1);
    let last = shift(date, 1);
    while (dayOff(shift(last, 1))) last = shift(last, 1);
    const days = daysFrom(first, last) + 1;
    found.push({ date: isoDate(date), days, from: isoDate(first), to: isoDate(last) });
  }
  bridgeDaysByYear.set(year, found);
  return found;
}
