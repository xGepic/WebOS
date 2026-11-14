# Spec 0006: Apple Calendar and the Day View

Status: built (2026-11-14); the CalDAV edge awaits a check against iCloud
Related: [Spec 0005: Calendar Marks](0005-calendar-marks.md), [Spec 0002: More Widgets](0002-more-widgets.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, my meetings, trainings and appointments live in Apple Calendar on my iPhone and Mac. The Calendar Widget shows holidays and my Countdowns, but not what I actually have on, so I still reach for my phone to see what today or next Tuesday looks like. And a day in the Widget can only be copied, not looked at.

## Solution

**Apple Calendar** becomes webOS's first **Data Source**:

- In **Settings › Apple Calendar** I sign in with my Apple ID and an **app-specific password**, pick which of my calendars to show, and can sync now or disconnect.
- webOS reads my events from iCloud (read-only) and keeps them fresh: a new tab syncs once the last sync is 15 minutes old.
- Days with events get a dot in the month, next to the holiday and Countdown dots.

Clicking a day opens the **Day View** in the Widget: the day's holiday, Countdowns and events (time, title, calendar colour, place), and sunrise and sunset in the Weather city. ‹ goes back to the month; ← and → step through days; Copy copies the date as before.

## User Stories

### Connecting

1. As a developer, I want to connect my iCloud calendars with my Apple ID and an app-specific password, so that webOS can read my events without my Apple ID password.
2. As a developer, I want Settings to tell me how to make an app-specific password, with a link, so that I can set it up without searching.
3. As a developer, I want a wrong password or Apple ID to be refused with a clear message, and nothing stored, so that I know to try again.
4. As a developer, I want to choose which calendars are shown, so that shared or noisy calendars stay out of the Widget.
5. As a developer, I want to sync now and to see when the last sync was, so that I trust what I see.
6. As a developer, I want to disconnect, which forgets the password and every stored event, so that I can take webOS off my account.
7. As a developer, I want Settings to say plainly that the password is kept unencrypted on this machine and can be revoked at appleid.apple.com, so that I can decide with that in mind.

### Seeing

8. As a developer, I want a dot on days with events, so that I see a busy day in the month.
9. As a developer, I want hovering a day to name its events with its holiday and Countdowns, so that I don't have to open it.
10. As a developer, I want to click a day to see it in full, so that I see what I have on.
11. As a developer, I want all-day events first, then timed events in order with their times, so that the day reads top to bottom.
12. As a developer, I want each event marked in its calendar's colour, so that I can tell work from training at a glance.
13. As a developer, I want recurring events, their exceptions and cancelled occurrences to show as in Apple Calendar, so that the Widget never shows a meeting that was moved or cancelled.
14. As a developer, I want an event that runs past midnight to show on each day it covers, with when it starts or ends that day, so that a late flight or an overnight race is on both days.
15. As a developer, I want the Day View to show sunrise and sunset in my Weather city, so that I can plan a run around daylight.
16. As a developer, I want ← and → to move to the previous and next day, and Esc or ‹ to go back to the month, so that I can browse by keyboard.
17. As a developer, I want the Day View to say when a day is outside the synced range, so that an empty day isn't mistaken for a free one.
18. As a developer, I want the events I last synced to show at once in a new tab, even offline, so that the Widget is never empty while it fetches.

### Safe keeping

19. As a developer, I want backups to leave out my Apple ID, password and events, and importing a backup to keep this machine's connection, so that a backup file never carries my password.

## Implementation Decisions

### Platform

- iCloud has no web API; its calendars speak **CalDAV** at `https://caldav.icloud.com/`, with Basic authentication by Apple ID and an app-specific password. The extension asks for `https://*.icloud.com/*` as an optional host permission when the user clicks Connect, since each account's calendars are served from its own `pNN-caldav.icloud.com` host, and gives it back on Disconnect. A required host permission wasn't enough: the browser can withhold one added in an update, and then CORS stops every request. Like the weather, it only works in the extension: `ng serve` in a normal tab is blocked by CORS.
- A new edge, **`CalendarServer`** (`src/core/edges.ts`), with `calendars(account)` and `events(account, calendarUrl, range)`. The iCloud one (`src/edges/icloud-calendar.ts`) finds the principal, then the calendar home, then lists the event calendars (name, colour) with `PROPFIND`, and fetches events overlapping the range with a CalDAV `REPORT` (`calendar-query` with a `time-range`). It returns each event resource's iCalendar text; it parses the XML with `DOMParser`. A refused sign-in rejects with a `FetchError` with status 401.
- The core reads iCalendar with **ical.js** (MPL-2.0), loaded with a dynamic `import()` the first time events are read, so it stays out of the initial bundle. It expands recurrences itself (RRULE, RDATE, EXDATE, overridden occurrences), resolves `TZID`s from the resource's `VTIMEZONE`s, and drops `STATUS:CANCELLED`.

### Core

- `src/core/time/apple-calendar.ts`: reading event resources into **Event** occurrences within a range, the Day View, and the day marks. The Calendar API gains `day(date)` and an `appleCalendar` part: `status()`, `connect(appleId, password)`, `setShown(calendarUrl, shown)`, `sync()`, `disconnect()`.
- Syncing uses the existing refresher: due after 15 minutes, one fetch at a time; a failed sync keeps the stored events. A refused password keeps the account but says so in Settings and on the Day View.
- The synced range runs from the first day of last month to the last day of the sixth month ahead, worked out at each sync.
- `connect` lists the calendars first: on a 401 it resolves `refused`, on any other failure `unreachable`, and stores nothing. On success it stores the account and the calendars (all shown) and syncs.
- `CalendarDay` gains `events`: the titles of the shown calendars' events on that day.
- Events are placed on days in the machine's time zone, like the rest of the Calendar. An all-day event covers its dates (DTEND exclusive); a timed one covers each local day it overlaps.

### Persisted state

- **Schema 20** adds `appleCalendar: { account: { appleId, password } | null, calendars: [{ url, name, color, shown }], sync: { fetchedAt, from, to, events } | null }`. The migration adds it empty.
- Stored events are a cache of occurrences, already expanded: `{ calendar, title, location?, allDay: true, startDate, endDate } | { calendar, title, location?, allDay: false, start, end }` (dates as `2026-11-24`, instants as epoch milliseconds).
- A backup export sets `appleCalendar` to its empty value; an import keeps this machine's `appleCalendar` instead of the file's.

### Widget

_Spec 0007 moved the Day View to the Today Widget; clicking a day now shows it there._


- Clicking a day (or Enter) opens the Day View in the Widget instead of copying; the Day View has a Copy button. Its list scrolls when the day is full.
- Its header: ‹ (back to the month, named after it), the weekday and date, and "in 3 days · Week 48". Then the holiday, the Countdowns, the events, and sunrise and sunset.
- An event: a bar in its calendar's colour, the time ("All day", "10:00 AM – 11:30 AM", "Until 9:00 AM", "From 10:00 PM"), the title and the place.
- The event dot is `--text-primary`, after the holiday's and the Countdowns'.

### Settings

- A new section, **Apple Calendar**, between Weather and Backup. Signed out: Apple ID and app-specific password fields, Connect, and a hint with the link to appleid.apple.com. Signed in: the Apple ID, a checkbox per calendar with its colour, "Synced 9:41 AM", Sync now and Disconnect, and any problem.

## Testing Decisions

- As before, tests go through the core's public API, with a test `CalendarServer` serving iCalendar fixtures.
- What is tested: connecting (accepted, refused, unreachable); a single event; all-day events over several days; a weekly event with an EXDATE and a moved occurrence; a cancelled occurrence; an event in another time zone; an event past midnight; hidden calendars; dots and tooltips in the month; the Day View's order and times; days outside the synced range; a failed sync keeping events; disconnecting; the backup leaving the connection out and an import keeping it; migrating a version 19 document.
- The CalDAV edge is checked by hand against iCloud, in the extension.

## Out of Scope

- Adding, editing or deleting events, invitations, reminders and notifications.
- Google, Outlook and other CalDAV servers (the edge is iCloud's, but nothing in the core is).
- Encrypting the stored password.
- Events on other Widgets (Clock, Countdown) and a Calendar App.
- Adding a Countdown from the Day View.
