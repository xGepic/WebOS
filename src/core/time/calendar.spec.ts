import { createWebOS, type CalendarDay, type CalendarMonth, type CalendarWeek, type WebOS } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

async function webosOn(date: Date) {
  const clock = createTestClock(date);
  const webos = await createWebOS({ storage: createMemoryStorage(), clock });
  return { webos, clock };
}

/** A week as the Widget shows it: "W46 | 9 10 11 12* …", other months' days in brackets, today starred. */
const week = ({ number, days }: CalendarWeek) =>
  `W${number} | ` + days.map(({ day, inMonth, today }) => (inMonth ? `${day}${today ? '*' : ''}` : `(${day})`)).join(' ');

describe('the Calendar Widget', () => {
  it('shows the current month in weeks from Monday to Sunday with ISO week numbers, filled out with the neighbouring months, today marked', async () => {
    // 1 November 2026 is a Sunday, so the first week starts on Monday 26 October.
    const { webos } = await webosOn(new Date(2026, 10, 12, 9, 0));

    const month = webos.calendar.month();

    expect(month).toMatchObject({ month: 'November', year: 2026, current: true, weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] });
    expect(month.weeks.map(week)).toEqual([
      'W44 | (26) (27) (28) (29) (30) (31) 1',
      'W45 | 2 3 4 5 6 7 8',
      'W46 | 9 10 11 12* 13 14 15',
      'W47 | 16 17 18 19 20 21 22',
      'W48 | 23 24 25 26 27 28 29',
      'W49 | 30 (1) (2) (3) (4) (5) (6)',
    ]);
    expect(month.weeks[2].days[3].date).toBe('2026-11-12');
  });

  it('always shows six weeks, so every month is the same height: a February that starts on a Monday is filled out with March', async () => {
    const { webos } = await webosOn(new Date(2027, 1, 1, 9, 0));

    expect(webos.calendar.month().weeks.map(week)).toEqual([
      'W5 | 1* 2 3 4 5 6 7',
      'W6 | 8 9 10 11 12 13 14',
      'W7 | 15 16 17 18 19 20 21',
      'W8 | 22 23 24 25 26 27 28',
      'W9 | (1) (2) (3) (4) (5) (6) (7)',
      'W10 | (8) (9) (10) (11) (12) (13) (14)',
    ]);
  });

  it('numbers weeks across the turn of the year as ISO 8601 does', async () => {
    // 2026 starts on a Thursday, so it has 53 weeks; 1–3 January 2027 still belong to its week 53.
    const { webos } = await webosOn(new Date(2026, 11, 15, 9, 0));

    const december = webos.calendar.month();
    const january = webos.calendar.month(1);

    // December's fifth row is 28 December to 3 January; its sixth is already 2027's week 1.
    expect(december.weeks.map((w) => w.number)).toEqual([49, 50, 51, 52, 53, 1]);
    expect(january.weeks[0]).toMatchObject({ number: 53 });
    expect(january.weeks[1].number).toBe(1);
  });

  it('moves to the next month at midnight', async () => {
    const { webos, clock } = await webosOn(new Date(2026, 10, 30, 23, 59));

    clock.advance(60_000);

    const month = webos.calendar.month();
    expect(month.month).toBe('December');
    expect(month.weeks.flatMap((w) => w.days).filter((day) => day.today)).toEqual([
      { date: '2026-12-01', day: 1, inMonth: true, today: true, weekend: false, countdowns: [] },
    ]);
  });
});

describe('browsing months', () => {
  it('shows earlier and later months, across years, with today marked only in its own month', async () => {
    const { webos } = await webosOn(new Date(2026, 10, 12, 9, 0));

    expect(webos.calendar.month(-1)).toMatchObject({ month: 'October', year: 2026, current: false });
    expect(webos.calendar.month(2)).toMatchObject({ month: 'January', year: 2027, current: false });
    expect(webos.calendar.month(-11)).toMatchObject({ month: 'December', year: 2025 });
    expect(webos.calendar.month(1).weeks.flatMap((w) => w.days).filter((day) => day.inMonth && day.today)).toEqual([]);
  });

  it('knows which month to show for a date, so moving through days can turn the page', async () => {
    const { webos } = await webosOn(new Date(2026, 10, 12, 9, 0));

    expect(webos.calendar.offsetOf('2026-11-30')).toBe(0);
    expect(webos.calendar.offsetOf('2026-12-01')).toBe(1);
    expect(webos.calendar.offsetOf('2025-12-31')).toBe(-11);
  });
});

describe('a day in the Calendar', () => {
  it.each([
    ['2026-11-12', 'Thu, Nov 12', 'today', 46],
    ['2026-11-13', 'Fri, Nov 13', 'tomorrow', 46],
    ['2026-11-11', 'Wed, Nov 11', 'yesterday', 46],
    ['2026-11-30', 'Mon, Nov 30', 'in 18 days', 49],
    ['2026-11-09', 'Mon, Nov 9', '3 days ago', 46],
    ['2027-01-01', 'Fri, Jan 1', 'in 50 days', 53],
  ])('describes %s as "%s · %s · week %i"', async (date, label, relative, week) => {
    const { webos } = await webosOn(new Date(2026, 10, 12, 9, 0));

    expect(webos.calendar.describe(date)).toEqual({ date, label, relative, week });
  });

  it('counts whole days across a daylight-saving change', async () => {
    // Europe and the US change their clocks in late October and early November.
    const { webos } = await webosOn(new Date(2026, 9, 20, 23, 30));

    expect(webos.calendar.describe('2026-11-10')?.relative).toBe('in 21 days');
  });

  it("doesn't describe text that isn't a date", async () => {
    const { webos } = await webosOn(new Date(2026, 10, 12, 9, 0));

    expect(webos.calendar.describe('2026-02-30')).toBeUndefined();
    expect(webos.calendar.describe('tomorrow')).toBeUndefined();
  });

  it('steps from day to day and week to week across months and years, for the keyboard', async () => {
    const { webos } = await webosOn(new Date(2026, 10, 12, 9, 0));

    expect(webos.calendar.addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(webos.calendar.addDays('2026-12-29', 7)).toBe('2027-01-05');
    expect(webos.calendar.addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(webos.calendar.addMonths('2026-11-12', 1)).toBe('2026-12-12');
    expect(webos.calendar.addMonths('2027-01-31', 1)).toBe('2027-02-28');
    expect(webos.calendar.addMonths('2027-01-15', -2)).toBe('2026-11-15');
    expect(webos.calendar.today()).toBe('2026-11-12');
  });
});

/** Every day of the month (not the neighbouring months' days) that has a holiday, as "2026-12-25 Christmas Day". */
const holidaysIn = (month: CalendarMonth) =>
  month.weeks.flatMap((w) => w.days).flatMap((day) => (day.inMonth && day.holiday ? [`${day.date} ${day.holiday}`] : []));

/** A day of the grid by its date. */
const dayOf = (month: CalendarMonth, date: string): CalendarDay | undefined =>
  month.weeks.flatMap((w) => w.days).find((day) => day.date === date);

/** The holidays of the twelve months from `offset`, as `holidaysIn` lists them. */
const holidaysOfYear = (webos: WebOS, offset = 0) =>
  Array.from({ length: 12 }, (_, i) => holidaysIn(webos.calendar.month(offset + i))).flat();

describe('weekends on the Calendar', () => {
  it('marks Saturdays and Sundays, including the neighbouring months’ days', async () => {
    const { webos } = await webosOn(new Date(2026, 10, 12, 9, 0));

    const weeks = webos.calendar.month().weeks;

    expect(weeks.map((w) => w.days.map((day) => (day.weekend ? 'W' : '-')).join(''))).toEqual(Array(6).fill('-----WW'));
    expect(weeks[0].days[5]).toMatchObject({ date: '2026-10-31', inMonth: false, weekend: true });
  });
});

describe('Countdowns on the Calendar', () => {
  it('names the Countdowns on their days, by title, in every month that shows the day', async () => {
    const { webos } = await webosOn(new Date(2026, 10, 12, 9, 0));
    await webos.countdowns.add({ title: 'Release', date: '2026-11-30' });
    await webos.countdowns.add({ title: 'Party', date: '2026-11-30' });
    await webos.countdowns.add({ title: 'Race', date: '2027-04-25' });

    expect(dayOf(webos.calendar.month(), '2026-11-30')?.countdowns).toEqual(['Party', 'Release']);
    expect(dayOf(webos.calendar.month(), '2026-11-29')?.countdowns).toEqual([]);
    // 30 November also fills out December's first week.
    expect(dayOf(webos.calendar.month(1), '2026-11-30')?.countdowns).toEqual(['Party', 'Release']);
    expect(dayOf(webos.calendar.month(5), '2027-04-25')?.countdowns).toEqual(['Race']);
  });

  it('follows a Countdown as it is moved and deleted', async () => {
    const { webos } = await webosOn(new Date(2026, 10, 12, 9, 0));
    const id = (await webos.countdowns.add({ title: 'Release', date: '2026-11-30' }))!;

    await webos.countdowns.edit(id, { title: 'Release', date: '2026-11-20' });
    expect(dayOf(webos.calendar.month(), '2026-11-30')?.countdowns).toEqual([]);
    expect(dayOf(webos.calendar.month(), '2026-11-20')?.countdowns).toEqual(['Release']);

    await webos.countdowns.delete(id);
    expect(dayOf(webos.calendar.month(), '2026-11-20')?.countdowns).toEqual([]);
  });
});

describe('Austrian public holidays on the Calendar', () => {
  it('marks the 13 public holidays, those after Easter moving with it', async () => {
    const { webos } = await webosOn(new Date(2026, 0, 1, 9, 0));

    // Easter Sunday 2026 is 5 April.
    expect(holidaysOfYear(webos)).toEqual([
      '2026-01-01 New Year’s Day',
      '2026-01-06 Epiphany',
      '2026-04-06 Easter Monday',
      '2026-05-01 Labour Day',
      '2026-05-14 Ascension Day',
      '2026-05-25 Whit Monday',
      '2026-06-04 Corpus Christi',
      '2026-08-15 Assumption Day',
      '2026-10-26 National Day',
      '2026-11-01 All Saints’ Day',
      '2026-12-08 Immaculate Conception',
      '2026-12-25 Christmas Day',
      '2026-12-26 St. Stephen’s Day',
    ]);
  });

  it.each([
    [2024, '2024-04-01', '2024-05-30'],
    [2025, '2025-04-21', '2025-06-19'],
    [2027, '2027-03-29', '2027-05-27'],
    [2038, '2038-04-26', '2038-06-24'],
  ])('finds Easter in %i: Easter Monday is %s and Corpus Christi %s', async (year, easterMonday, corpusChristi) => {
    const { webos } = await webosOn(new Date(year, 0, 1, 9, 0));

    expect(holidaysOfYear(webos)).toEqual(expect.arrayContaining([`${easterMonday} Easter Monday`, `${corpusChristi} Corpus Christi`]));
  });

  it('marks next year’s holidays on the days that fill out December', async () => {
    // December 2026's last week runs into 2027: 1 January is a Friday.
    const { webos } = await webosOn(new Date(2026, 11, 1, 9, 0));

    expect(dayOf(webos.calendar.month(), '2027-01-01')).toMatchObject({ inMonth: false, holiday: 'New Year’s Day' });
  });

  it('leaves ordinary days without a holiday', async () => {
    const { webos } = await webosOn(new Date(2026, 10, 12, 9, 0));

    expect(holidaysIn(webos.calendar.month())).toEqual(['2026-11-01 All Saints’ Day']);
    expect(dayOf(webos.calendar.month(), '2026-11-12')?.holiday).toBeUndefined();
  });
});
