import { FetchError } from '../edges';
import { createWebOS, type WeatherCity } from '../index';
import { createMemoryStorage, createTestCalendarServer, createTestClock, type TestCalendarServer } from '../testing';

const MINUTE = 60_000;
const WORK = 'https://p42-caldav.icloud.com/123/calendars/work/';
const TRAINING = 'https://p42-caldav.icloud.com/123/calendars/training/';
const vienna: WeatherCity = {
  name: 'Vienna',
  region: 'Vienna',
  country: 'Austria',
  latitude: 48.20849,
  longitude: 16.37208,
  timeZone: 'Europe/Vienna',
};

const VIENNA_ZONE = `BEGIN:VTIMEZONE
TZID:Europe/Vienna
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
DTSTART:19810329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
TZNAME:CEST
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19961027T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
TZNAME:CET
END:STANDARD
END:VTIMEZONE`;

const NEW_YORK_ZONE = `BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
DTSTART:20070311T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
TZNAME:EDT
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
DTSTART:20071104T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
TZNAME:EST
END:STANDARD
END:VTIMEZONE`;

/** An event resource as iCloud serves it: a VCALENDAR with its time zones and VEVENTs. */
const resource = (...parts: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Apple Inc.//iCloud//EN', ...parts, 'END:VCALENDAR'].join('\r\n');
const vevent = (...lines: string[]) => ['BEGIN:VEVENT', 'DTSTAMP:20261101T000000Z', ...lines, 'END:VEVENT'].join('\r\n');

const standup = resource(vevent('UID:standup', 'SUMMARY:Standup', 'DTSTART:20261116T083000Z', 'DTEND:20261116T084500Z', 'LOCATION:Zoom'));
const nycCall = resource(
  NEW_YORK_ZONE,
  vevent('UID:nyc', 'SUMMARY:Call with New York', 'DTSTART;TZID=America/New_York:20261117T100000', 'DTEND;TZID=America/New_York:20261117T110000'),
);
const skiTrip = resource(vevent('UID:ski', 'SUMMARY:Ski trip', 'DTSTART;VALUE=DATE:20261127', 'DTEND;VALUE=DATE:20261130'));
const nightTrain = resource(
  VIENNA_ZONE,
  vevent('UID:train', 'SUMMARY:Night train', 'DTSTART;TZID=Europe/Vienna:20261120T220000', 'DTEND;TZID=Europe/Vienna:20261121T073000'),
);
const cancelled = resource(vevent('UID:gone', 'SUMMARY:Cancelled lunch', 'STATUS:CANCELLED', 'DTSTART:20261116T110000Z', 'DTEND:20261116T120000Z'));
/** Every Tuesday at 6 PM, except Nov 17; Nov 24 moved to Wednesday 7 PM; Dec 1 cancelled. */
const training = resource(
  VIENNA_ZONE,
  vevent(
    'UID:training',
    'SUMMARY:Training',
    'DTSTART;TZID=Europe/Vienna:20261006T180000',
    'DTEND;TZID=Europe/Vienna:20261006T193000',
    'RRULE:FREQ=WEEKLY;BYDAY=TU',
    'EXDATE;TZID=Europe/Vienna:20261117T180000',
  ),
  vevent(
    'UID:training',
    'RECURRENCE-ID;TZID=Europe/Vienna:20261124T180000',
    'SUMMARY:Training (moved)',
    'DTSTART;TZID=Europe/Vienna:20261125T190000',
    'DTEND;TZID=Europe/Vienna:20261125T203000',
  ),
  vevent(
    'UID:training',
    'RECURRENCE-ID;TZID=Europe/Vienna:20261201T180000',
    'STATUS:CANCELLED',
    'SUMMARY:Training',
    'DTSTART;TZID=Europe/Vienna:20261201T180000',
    'DTEND;TZID=Europe/Vienna:20261201T193000',
  ),
);

const icloud = () =>
  createTestCalendarServer(
    [
      { url: WORK, name: 'Work', color: '#1badf8' },
      { url: TRAINING, name: 'Training', color: '#63da38' },
    ],
    { [WORK]: [standup, nycCall, skiTrip, nightTrain, cancelled], [TRAINING]: [training] },
  );

const refused = () => new FetchError(401, 'caldav.icloud.com answered 401');

async function setUp({
  server = icloud(),
  storage = createMemoryStorage(),
  clock = createTestClock(new Date(2026, 10, 14, 9, 0)),
}: { server?: TestCalendarServer; storage?: ReturnType<typeof createMemoryStorage>; clock?: ReturnType<typeof createTestClock> } = {}) {
  const webos = await createWebOS({ storage, clock, calendars: server });
  return { webos, server, storage, clock };
}

/** Sets up and connects, waiting for the first sync. */
async function connected(options: Parameters<typeof setUp>[0] = {}) {
  const setup = await setUp(options);
  expect(await setup.webos.appleCalendar.connect(' stefan@icloud.com ', 'abcd-efgh-ijkl-mnop')).toBe('connected');
  await setup.webos.appleCalendar.sync();
  return setup;
}

/** The Day View's events as "time · title". */
const eventsOn = (webos: Awaited<ReturnType<typeof setUp>>['webos'], date: string) =>
  webos.calendar.day(date)!.events.map((event) => `${event.time} · ${event.title}`);

/** A day in the Calendar's current month grid. */
const dayInMonth = (webos: Awaited<ReturnType<typeof setUp>>['webos'], date: string, offset = 0) =>
  webos.calendar
    .month(offset)
    .weeks.flatMap((week) => week.days)
    .find((day) => day.date === date)!;

describe('connecting Apple Calendar', () => {
  it('signs in, stores the account with every calendar shown, and syncs', async () => {
    const { webos, server } = await connected();

    expect(webos.appleCalendar.status()).toEqual({
      connected: true,
      appleId: 'stefan@icloud.com',
      calendars: [
        { url: WORK, name: 'Work', color: '#1badf8', shown: true },
        { url: TRAINING, name: 'Training', color: '#63da38', shown: true },
      ],
      syncedAt: '9:00 AM',
      syncing: false,
    });
    expect(server.requests[0]).toEqual({ kind: 'calendars', account: { appleId: 'stefan@icloud.com', password: 'abcd-efgh-ijkl-mnop' } });
  });

  it('asks for the events from the first of last month to the end of the sixth month ahead', async () => {
    const { webos, server } = await connected();

    const range = server.requests.find((request) => request.kind === 'events')!.range!;
    expect(range.start).toEqual(new Date(2026, 9, 1));
    expect(range.end).toEqual(new Date(2027, 5, 1));
    expect(webos.calendar.day('2027-07-01')!.notice).toBe('Apple Calendar is synced from Oct 1, 2026 to May 31, 2027.');
  });

  it('stores nothing when Apple refuses the sign-in', async () => {
    const server = icloud();
    server.failure = refused();
    const { webos, storage } = await setUp({ server });

    expect(await webos.appleCalendar.connect('stefan@icloud.com', 'wrong')).toBe('refused');
    expect(webos.appleCalendar.status()).toEqual({ connected: false });
    expect(await storage.read()).toMatchObject({ appleCalendar: { account: null } });
  });

  it('stores nothing when iCloud can’t be reached', async () => {
    const server = icloud();
    server.failure = new Error('offline');
    const { webos } = await setUp({ server });

    expect(await webos.appleCalendar.connect('stefan@icloud.com', 'abcd-efgh-ijkl-mnop')).toBe('unreachable');
    expect(webos.appleCalendar.status()).toEqual({ connected: false });
  });

  it('refuses a blank Apple ID or password without asking', async () => {
    const { webos, server } = await setUp();

    expect(await webos.appleCalendar.connect('  ', 'abcd')).toBe('refused');
    expect(await webos.appleCalendar.connect('stefan@icloud.com', ' ')).toBe('refused');
    expect(server.requests).toEqual([]);
  });

  it('forgets the account and every event on disconnecting', async () => {
    const { webos, storage } = await connected();

    await webos.appleCalendar.disconnect();

    expect(webos.appleCalendar.status()).toEqual({ connected: false });
    expect(webos.calendar.day('2026-11-16')!.events).toEqual([]);
    expect(dayInMonth(webos, '2026-11-16').events).toEqual([]);
    expect(await storage.read()).toMatchObject({ appleCalendar: { account: null, calendars: [], sync: null } });
  });
});

describe('the Day View', () => {
  it('lists a timed event with its time, place and calendar', async () => {
    const { webos } = await connected();

    expect(webos.calendar.day('2026-11-16')!.events).toEqual([
      { title: 'Standup', time: '9:30 AM – 9:45 AM', location: 'Zoom', calendar: 'Work', color: '#1badf8' },
    ]);
  });

  it('shows an event from another time zone in local time', async () => {
    const { webos } = await connected();

    expect(eventsOn(webos, '2026-11-17')).toEqual(['4:00 PM – 5:00 PM · Call with New York']);
  });

  it('shows an all-day event on each of its days, and not the day it ends', async () => {
    const { webos } = await connected();

    expect(eventsOn(webos, '2026-11-27')).toEqual(['All day · Ski trip']);
    expect(eventsOn(webos, '2026-11-29')).toEqual(['All day · Ski trip']);
    expect(eventsOn(webos, '2026-11-30')).toEqual([]);
  });

  it('shows an event past midnight on both days, with when it starts and ends', async () => {
    const { webos } = await connected();

    expect(eventsOn(webos, '2026-11-20')).toEqual(['From 10:00 PM · Night train']);
    expect(eventsOn(webos, '2026-11-21')).toEqual(['Until 7:30 AM · Night train']);
  });

  it('expands a recurring event, leaving out excluded and cancelled occurrences and moving a moved one', async () => {
    const { webos } = await connected();

    expect(eventsOn(webos, '2026-11-10')).toEqual(['6:00 PM – 7:30 PM · Training']);
    expect(eventsOn(webos, '2026-11-17')).toEqual(['4:00 PM – 5:00 PM · Call with New York']);
    expect(eventsOn(webos, '2026-11-24')).toEqual([]);
    expect(eventsOn(webos, '2026-11-25')).toEqual(['7:00 PM – 8:30 PM · Training (moved)']);
    expect(eventsOn(webos, '2026-12-01')).toEqual([]);
    expect(eventsOn(webos, '2026-12-08')).toEqual(['6:00 PM – 7:30 PM · Training']);
  });

  it('leaves out cancelled events', async () => {
    const { webos } = await connected();

    expect(eventsOn(webos, '2026-11-16')).not.toContain('12:00 PM – 1:00 PM · Cancelled lunch');
  });

  it('lists all-day events first, then the rest by time', async () => {
    const server = icloud();
    server.resources[WORK] = [
      resource(vevent('UID:b', 'SUMMARY:Review', 'DTSTART:20261118T130000Z', 'DTEND:20261118T140000Z')),
      resource(vevent('UID:a', 'SUMMARY:Breakfast', 'DTSTART:20261118T070000Z', 'DTEND:20261118T080000Z')),
      resource(vevent('UID:c', 'SUMMARY:Conference', 'DTSTART;VALUE=DATE:20261118')),
    ];
    const { webos } = await connected({ server });

    expect(eventsOn(webos, '2026-11-18')).toEqual([
      'All day · Conference',
      '8:00 AM – 9:00 AM · Breakfast',
      '2:00 PM – 3:00 PM · Review',
    ]);
  });

  it('names the day, how far it is, its week, holiday and Countdowns, and sunrise and sunset in the Weather city', async () => {
    const storage = createMemoryStorage();
    const { webos } = await setUp({ storage });
    await webos.weather.setCity(vienna);
    await webos.countdowns.add({ title: 'Release', date: '2026-12-08' });

    expect(webos.calendar.day('2026-12-08')).toEqual({
      date: '2026-12-08',
      weekday: 'Tuesday',
      month: 'December',
      label: 'December 8, 2026',
      shortLabel: 'Tue, Dec 8',
      relative: 'in 24 days',
      week: 50,
      holiday: 'Immaculate Conception',
      countdowns: ['Release'],
      events: [],
      sun: { kind: 'day', sunrise: '7:31 AM', sunset: '4:00 PM' },
    });
  });

  it('has no events, and says nothing about them, without Apple Calendar', async () => {
    const { webos } = await setUp();

    expect(webos.calendar.day('2026-11-16')!.events).toEqual([]);
    expect(webos.calendar.day('2026-11-16')!.notice).toBeUndefined();
  });

  it('is undefined for text that isn’t a date', async () => {
    const { webos } = await setUp();

    expect(webos.calendar.day('2026-02-30')).toBeUndefined();
  });
});

describe('the month', () => {
  it('names the shown events on each of their days', async () => {
    const { webos } = await connected();

    expect(dayInMonth(webos, '2026-11-16').events).toEqual(['Standup']);
    expect(dayInMonth(webos, '2026-11-21').events).toEqual(['Night train']);
    expect(dayInMonth(webos, '2026-11-28').events).toEqual(['Ski trip']);
    expect(dayInMonth(webos, '2026-11-30').events).toEqual([]);
    expect(dayInMonth(webos, '2026-12-08', 1).events).toEqual(['Training']);
  });

  it('leaves out a hidden calendar’s events, and brings them back when it is shown', async () => {
    const { webos } = await connected();

    await webos.appleCalendar.setShown(TRAINING, false);
    expect(dayInMonth(webos, '2026-11-10').events).toEqual([]);
    expect(webos.calendar.day('2026-11-10')!.events).toEqual([]);

    await webos.appleCalendar.setShown(TRAINING, true);
    expect(dayInMonth(webos, '2026-11-10').events).toEqual(['Training']);
  });
});

describe('syncing', () => {
  it('shows the last sync at once in a new tab, and syncs again once it is 15 minutes old', async () => {
    const { storage, clock, server } = await connected();
    const before = server.requests.length;

    clock.advance(10 * MINUTE);
    const soon = await createWebOS({ storage, clock, calendars: server });
    expect(eventsOn(soon, '2026-11-16')).toEqual(['9:30 AM – 9:45 AM · Standup']);
    expect(server.requests.length).toBe(before);

    clock.advance(5 * MINUTE);
    const later = await createWebOS({ storage, clock, calendars: server });
    await later.appleCalendar.sync();
    expect(server.requests.length).toBeGreaterThan(before);
  });

  it('keeps the last sync when a sync fails, and says so', async () => {
    const { webos, server, clock } = await connected();
    server.failure = new Error('offline');
    clock.advance(20 * MINUTE);

    await webos.appleCalendar.sync();

    expect(eventsOn(webos, '2026-11-16')).toEqual(['9:30 AM – 9:45 AM · Standup']);
    expect(webos.calendar.day('2026-11-16')!.notice).toBe('Apple Calendar couldn’t be reached. Synced 9:00 AM.');
    expect(webos.appleCalendar.status()).toMatchObject({ problem: 'failed', syncedAt: '9:00 AM' });
  });

  it('says when Apple refuses the password later, keeping the account', async () => {
    const { webos, server } = await connected();
    server.failure = refused();

    await webos.appleCalendar.sync();

    expect(webos.appleCalendar.status()).toMatchObject({ connected: true, problem: 'refused' });
    expect(webos.calendar.day('2026-11-16')!.notice).toBe('Apple refused the password. Sign in again in Settings.');
  });

  it('adds new calendars shown, keeps hidden ones hidden, and drops deleted ones', async () => {
    const { webos, server } = await connected();
    await webos.appleCalendar.setShown(TRAINING, false);
    server.calendarList = [
      { url: TRAINING, name: 'Training', color: '#63da38' },
      { url: 'https://p42-caldav.icloud.com/123/calendars/family/', name: 'Family' },
    ];

    await webos.appleCalendar.sync();

    expect(webos.appleCalendar.status()).toMatchObject({
      calendars: [
        { url: TRAINING, name: 'Training', shown: false },
        { url: 'https://p42-caldav.icloud.com/123/calendars/family/', name: 'Family', color: '#6f8fdc', shown: true },
      ],
    });
  });

  it('skips an event it can’t read, keeping the rest', async () => {
    const server = icloud();
    server.resources[WORK] = ['BEGIN:VCALENDAR\r\nnot really', standup];
    const { webos } = await connected({ server });

    expect(eventsOn(webos, '2026-11-16')).toEqual(['9:30 AM – 9:45 AM · Standup']);
  });

  it('says it is syncing before the first sync is done', async () => {
    const server = icloud();
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const events = server.events.bind(server);
    server.events = async (...args) => {
      await held;
      return events(...args);
    };
    const { webos } = await setUp({ server });

    await webos.appleCalendar.connect('stefan@icloud.com', 'abcd-efgh-ijkl-mnop');

    expect(webos.appleCalendar.status()).toMatchObject({ syncing: true });
    expect(webos.calendar.day('2026-11-16')!.notice).toBe('Syncing Apple Calendar…');
    release();
    await webos.appleCalendar.sync();
    expect(webos.appleCalendar.status()).toMatchObject({ syncing: false });
  });
});

describe('backups', () => {
  it('leave out the Apple ID, password and events', async () => {
    const { webos } = await connected();

    const text = webos.backup.export().text;

    expect(text).not.toContain('abcd-efgh-ijkl-mnop');
    expect(text).not.toContain('stefan@icloud.com');
    expect(JSON.parse(text).appleCalendar).toEqual({ account: null, calendars: [], sync: null });
  });

  it('keep this machine’s connection when imported', async () => {
    const { webos } = await connected();
    const backup = webos.backup.export().text;

    await webos.backup.import(backup);

    expect(webos.appleCalendar.status()).toMatchObject({ connected: true, appleId: 'stefan@icloud.com' });
    expect(eventsOn(webos, '2026-11-16')).toEqual(['9:30 AM – 9:45 AM · Standup']);
  });
});
