import { formatDate, formatTime } from '../format';
import type { WeatherCity } from '../sky/weather';
import type { Store } from '../store';
import * as calendar from './calendar';
import * as countdown from './countdown';
import * as holidays from './holidays';
import * as worldClock from './world-clock';

export interface TimeApi {
  readonly clock: {
    /** The current time in 12-hour format, e.g. "9:05 AM". */
    time(): string;
    /** Today's date, e.g. "Thursday, November 12". */
    date(): string;
  };
  readonly calendar: {
    /**
     * A month for the Calendar Widget, `offset` months from the current one
     * (0 by default), in weeks starting on Monday with ISO week numbers, today
     * marked, and each day's Austrian public holiday and Countdowns.
     */
    month(offset?: number): calendar.CalendarMonth;
    /** A day (`2026-11-30`) for the line under the grid: "Mon, Nov 30", "in 18 days", week 49. Undefined for text that isn't a date. */
    describe(date: string): calendar.CalendarDayDetails | undefined;
    /** The date `days` days after `date`, for moving through the grid with the keyboard. */
    addDays(date: string, days: number): string;
    /** The same day `months` months after `date`, or the last day of a shorter month. */
    addMonths(date: string, months: number): string;
    /** How many months from the current one the month of `date` is: the `offset` that shows it. */
    offsetOf(date: string): number;
    /** Today, as `2026-11-12`. */
    today(): string;
  };
  /** Days the user counts down to, for the Countdown Widget, managed in Settings. */
  readonly countdowns: {
    /** Every Countdown, soonest first. */
    list(): readonly countdown.Countdown[];
    /** Today's and later Countdowns, soonest first, with the days to go. */
    upcoming(): readonly countdown.CountdownView[];
    /** Adds a Countdown. Resolves to its id, or undefined if the title is blank or the date isn't a real one. */
    add(input: countdown.CountdownInput): Promise<string | undefined>;
    /** Changes a Countdown. Resolves to whether it was changed: not with a blank title or a date that isn't real. */
    edit(id: string, input: countdown.CountdownInput): Promise<boolean>;
    delete(id: string): Promise<void>;
  };
  /** The World Clock's cities, managed in the World Clock App. */
  readonly worldClock: {
    /** Each city, in the order the user put them, with its time now and how it compares with the time here. */
    view(): readonly worldClock.WorldClockView[];
    /**
     * Adds a city found by `weather.searchCities` at the end. Resolves to
     * whether it was added: not without a time zone, if it is already there,
     * or once there are `MAX_WORLD_CLOCKS`.
     */
    add(city: WeatherCity): Promise<boolean>;
    /** Moves a city to `toIndex` (clamped). */
    move(id: string, toIndex: number): Promise<void>;
    delete(id: string): Promise<void>;
  };
}

/** The Clock, the Calendar, Countdowns and the World Clock. */
export function createTime(store: Store): TimeApi {
  const { clock } = store;
  const state = store.state;

  /** Applies a change to the Countdowns, unless it was refused (undefined). Resolves to whether it was applied. */
  const commitCountdowns = async (list: countdown.Countdown[] | undefined) => {
    if (!list) return false;
    await store.commit({ ...state(), countdowns: list });
    return true;
  };

  /** Applies a change to the World Clock's cities, unless it was refused (undefined). Resolves to whether it was applied. */
  const commitWorldClocks = async (list: worldClock.WorldClockCity[] | undefined) => {
    if (!list) return false;
    await store.commit({ ...state(), worldClocks: list });
    return true;
  };

  /** The holidays and Countdowns on the days of the month `offset` months from now. */
  const marksFor = (offset: number): calendar.DayMarks => {
    const holidayDays = new Map<string, string>();
    for (const year of calendar.yearsShown(clock.now(), offset)) {
      for (const holiday of holidays.holidays(year)) holidayDays.set(holiday.date, holiday.name);
    }
    const countdownDays = new Map<string, string[]>();
    for (const { date, title } of [...state().countdowns].sort((a, b) => a.title.localeCompare(b.title))) {
      countdownDays.set(date, [...(countdownDays.get(date) ?? []), title]);
    }
    return { holidays: holidayDays, countdowns: countdownDays };
  };

  return {
    clock: {
      time: () => formatTime(clock.now()),
      date: () => formatDate(clock.now()),
    },
    calendar: {
      month: (offset = 0) => calendar.monthView(clock.now(), offset, marksFor(offset)),
      describe: (date) => calendar.describeDay(date, clock.now()),
      addDays: calendar.addDays,
      addMonths: calendar.addMonths,
      offsetOf: (date) => calendar.monthOffset(date, clock.now()),
      today: () => calendar.isoDate(clock.now()),
    },
    countdowns: {
      list: () => [...state().countdowns].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)),
      upcoming: () => countdown.upcoming(state().countdowns, clock.now()),
      async add(input) {
        const id = crypto.randomUUID();
        return (await commitCountdowns(countdown.addCountdown(state().countdowns, id, input))) ? id : undefined;
      },
      edit: (id, input) => commitCountdowns(countdown.editCountdown(state().countdowns, id, input)),
      delete: async (id) => {
        await commitCountdowns(countdown.deleteCountdown(state().countdowns, id));
      },
    },
    worldClock: {
      view: () => worldClock.worldClockView(state().worldClocks, clock.now()),
      add: (city) =>
        commitWorldClocks(
          city.timeZone
            ? worldClock.addWorldClock(state().worldClocks, {
                id: crypto.randomUUID(),
                name: city.name,
                country: city.country,
                timeZone: city.timeZone,
              })
            : undefined,
        ),
      move: async (id, toIndex) => {
        await commitWorldClocks(worldClock.moveWorldClock(state().worldClocks, id, toIndex));
      },
      delete: async (id) => {
        await commitWorldClocks(worldClock.deleteWorldClock(state().worldClocks, id));
      },
    },
  };
}
