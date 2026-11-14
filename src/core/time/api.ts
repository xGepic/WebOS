import { FetchError, type CalendarServer } from '../edges';
import { formatDate, formatTime } from '../format';
import { createRefresher } from '../refresher';
import type { WeatherCity } from '../sky/weather';
import type { Store } from '../store';
import * as apple from './apple-calendar';
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
    /**
     * A day (`2026-11-30`) in full, for the Day View: its holiday, Countdowns,
     * shown Apple Calendar events, and sunrise and sunset in the Weather city.
     * Undefined for text that isn't a date.
     */
    day(date: string): apple.CalendarDayView | undefined;
    /** The date `days` days after `date`, for moving through the grid with the keyboard. */
    addDays(date: string, days: number): string;
    /** The same day `months` months after `date`, or the last day of a shorter month. */
    addMonths(date: string, months: number): string;
    /** How many months from the current one the month of `date` is: the `offset` that shows it. */
    offsetOf(date: string): number;
    /** Today, as `2026-11-12`. */
    today(): string;
  };
  /**
   * Apple Calendar, read-only from iCloud, managed in Settings. The last sync
   * is stored, so a new tab shows it at once; a new tab syncs again once it is
   * 15 minutes old.
   */
  readonly appleCalendar: {
    /** What Settings shows: signed out, or the account, its calendars and the last sync. */
    status(): apple.AppleCalendarStatus;
    /**
     * Signs in and, if Apple accepts, stores the account with all its calendars
     * shown, and syncs. Stores nothing if Apple refuses the sign-in (`refused`)
     * or can't be reached (`unreachable`).
     */
    connect(appleId: string, password: string): Promise<'connected' | 'refused' | 'unreachable'>;
    /** Shows or hides a calendar's events. */
    setShown(calendarUrl: string, shown: boolean): Promise<void>;
    /** Syncs now, unless a sync is already under way. A failed sync keeps the last one and doesn't reject. */
    sync(): Promise<void>;
    /** Forgets the account, its password and every stored event. */
    disconnect(): Promise<void>;
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

/** The Clock, the Calendar with Apple Calendar, Countdowns and the World Clock. The Desktop loading syncs Apple Calendar if it is due. */
export function createTime(store: Store, server?: CalendarServer): TimeApi {
  const { clock } = store;
  const state = store.state;

  const sync = createRefresher(store, {
    source: (current) => (server ? (current.appleCalendar.account ?? undefined) : undefined),
    same: apple.sameAccount,
    isDue: (current, now) => apple.isDue(current.appleCalendar.sync, now),
    async load(account) {
      const found = await server!.calendars(account);
      const range = apple.syncRange(clock.now());
      const fetchedAt = clock.now().getTime();
      const perCalendar = await Promise.all(
        found.map(async ({ url }) => apple.readEvents(url, await server!.events(account, url, range), range.start, range.end)),
      );
      return { found, latest: { fetchedAt, from: range.from, to: range.to, events: perCalendar.flat() } };
    },
    store: (current, { found, latest }) => ({
      ...current,
      appleCalendar: { ...current.appleCalendar, calendars: apple.mergeCalendars(current.appleCalendar.calendars, found), sync: latest },
    }),
    problemOf: (error): apple.AppleCalendarProblem => (error instanceof FetchError && error.status === 401 ? 'refused' : 'failed'),
  });
  /** Whether this tab's sync is under way, for Settings. */
  let syncing = false;
  const syncNow = async (force: boolean) => {
    if (!server || !state().appleCalendar.account) return;
    syncing = true;
    store.notify();
    try {
      await sync.refresh(force);
    } finally {
      syncing = false;
      store.notify();
    }
  };
  void syncNow(false);

  /** The shown events' titles by date, worked out again only when Apple Calendar's state changes. */
  let eventTitles: { for: apple.AppleCalendarState; byDate: Map<string, string[]> } | undefined;
  const eventsByDate = () => {
    const current = state().appleCalendar;
    if (eventTitles?.for !== current) eventTitles = { for: current, byDate: apple.eventTitlesByDate(current) };
    return eventTitles.byDate;
  };

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
    return { holidays: holidayDays, countdowns: countdownDays, events: eventsByDate() };
  };

  /** The Day View of `date`, with its holiday and Countdowns. */
  const day = (date: string) => {
    const details = calendar.describeDay(date, clock.now());
    if (!details) return undefined;
    const holiday = holidays.holidays(Number(date.slice(0, 4))).find((candidate) => candidate.date === date)?.name;
    const countdowns = state()
      .countdowns.filter((candidate) => candidate.date === date)
      .map((candidate) => candidate.title)
      .sort((a, b) => a.localeCompare(b));
    return apple.dayView(date, clock.now(), {
      week: details.week,
      holiday,
      countdowns,
      apple: state().appleCalendar,
      problem: sync.problem(),
      city: state().weather.city,
    });
  };

  return {
    clock: {
      time: () => formatTime(clock.now()),
      date: () => formatDate(clock.now()),
    },
    calendar: {
      month: (offset = 0) => calendar.monthView(clock.now(), offset, marksFor(offset)),
      describe: (date) => calendar.describeDay(date, clock.now()),
      day,
      addDays: calendar.addDays,
      addMonths: calendar.addMonths,
      offsetOf: (date) => calendar.monthOffset(date, clock.now()),
      today: () => calendar.isoDate(clock.now()),
    },
    appleCalendar: {
      status: () => apple.appleCalendarStatus(state().appleCalendar, { syncing, problem: sync.problem(), now: clock.now() }),
      async connect(appleId, password) {
        const account = { appleId: appleId.trim(), password: password.trim() };
        if (!server || !account.appleId || !account.password) return 'refused';
        let found;
        try {
          found = await server.calendars(account);
        } catch (error) {
          return error instanceof FetchError && error.status === 401 ? 'refused' : 'unreachable';
        }
        sync.forget();
        await store.commit({ ...state(), appleCalendar: { account, calendars: apple.mergeCalendars([], found), sync: null } });
        void syncNow(true);
        return 'connected';
      },
      async setShown(calendarUrl, shown) {
        const current = state().appleCalendar;
        if (!current.calendars.some((choice) => choice.url === calendarUrl && choice.shown !== shown)) return;
        const calendars = current.calendars.map((choice) => (choice.url === calendarUrl ? { ...choice, shown } : choice));
        await store.commit({ ...state(), appleCalendar: { ...current, calendars } });
      },
      sync: () => syncNow(true),
      async disconnect() {
        sync.forget();
        await store.commit({ ...state(), appleCalendar: apple.NO_APPLE_CALENDAR });
      },
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
