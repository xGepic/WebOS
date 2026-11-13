import { isoDate } from './calendar';

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
