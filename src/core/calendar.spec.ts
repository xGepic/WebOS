import { createWebOS } from './index';
import { createMemoryStorage, createTestClock } from './testing';

async function webosOn(date: Date) {
  const clock = createTestClock(date);
  const webos = await createWebOS({ storage: createMemoryStorage(), clock });
  return { webos, clock };
}

/** A week as the Widget shows it: days of the month, with other months' days in brackets and today starred. */
const week = (days: { day: number; inMonth: boolean; today: boolean }[]) =>
  days.map(({ day, inMonth, today }) => (inMonth ? `${day}${today ? '*' : ''}` : `(${day})`)).join(' ');

describe('the Calendar Widget', () => {
  it('shows the current month in weeks from Monday to Sunday, filled out with the neighbouring months, today marked', async () => {
    // 1 November 2026 is a Sunday, so the first week starts on Monday 26 October.
    const { webos } = await webosOn(new Date(2026, 10, 12, 9, 0));

    const month = webos.calendar.month();

    expect(month).toMatchObject({ month: 'November', year: 2026, weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] });
    expect(month.weeks.map(week)).toEqual([
      '(26) (27) (28) (29) (30) (31) 1',
      '2 3 4 5 6 7 8',
      '9 10 11 12* 13 14 15',
      '16 17 18 19 20 21 22',
      '23 24 25 26 27 28 29',
      '30 (1) (2) (3) (4) (5) (6)',
    ]);
  });

  it('needs only four weeks for a February that starts on a Monday', async () => {
    const { webos } = await webosOn(new Date(2027, 1, 1, 9, 0));

    expect(webos.calendar.month().weeks.map(week)).toEqual([
      '1* 2 3 4 5 6 7',
      '8 9 10 11 12 13 14',
      '15 16 17 18 19 20 21',
      '22 23 24 25 26 27 28',
    ]);
  });

  it('moves to the next month at midnight', async () => {
    const { webos, clock } = await webosOn(new Date(2026, 10, 30, 23, 59));

    clock.advance(60_000);

    const month = webos.calendar.month();
    expect(month.month).toBe('December');
    expect(month.weeks.flat().filter((day) => day.today)).toEqual([{ day: 1, inMonth: true, today: true }]);
  });
});
