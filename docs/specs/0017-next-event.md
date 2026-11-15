# Spec 0017: The Next Event in the Menu Bar

Status: built (2026-11-15)
Related: [Spec 0006: Apple Calendar and the Day View](0006-apple-calendar.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, I want to know when my next meeting starts without looking for it. The Today Widget lists the whole day, but I have to read the times and work out how long I have, and it may not be on my Desktop at all.

## Solution

The Menu Bar shows the **Next Event** to the left of the time: a dot in its calendar's colour, its title and when it starts, e.g. "● Standup in 12 min" or "● Dentist at 2:30 PM". Hovering it gives the time, place and calendar. When nothing else starts today, nothing is shown.

## User Stories

1. As a developer, I want the Menu Bar to show the next Event that starts today, so that I know what is coming up from any new tab.
2. As a developer, I want the minutes to go when it is within the hour, and the time when it is further off, so that I can read how long I have at a glance.
3. As a developer, I want it to say "now" for the first five minutes of an Event, so that I notice I should be there.
4. As a developer, I want all-day Events, hidden calendars and cancelled Events left out, so that only things that start at a time are shown.
5. As a developer, I want a long title to be shortened before the time is, so that the Menu Bar stays on one line.

## Implementation Decisions

- `calendar.nextEvent()` in the core: of the shown calendars' timed Events, the one with the earliest start from five minutes ago to midnight tonight; on a tie, by title. It returns the Day View's `DayEvent` (title, time on today, place, calendar name and colour) plus `when`.
- `when`: "now" from its start to five minutes after it; "in N min" for 1 to 59 minutes, rounded up; "at 2:30 PM" for an hour or more.
- It is worked out from the last sync, like the Day View, so it shows offline and keeps showing if a sync fails. The core's minute tick keeps it up to date.
- The Menu Bar shows it before the time, in Edit Mode too. Its title has an ellipsis when the Menu Bar is crowded, and it's at most 22rem wide.
- No schema change.

## Testing Decisions

- Core tests through the public API, using the Apple Calendar fixtures: the minutes to go and rounding up as time passes, the time an hour or more away, "now" and moving on after five minutes, an Event past midnight starting tonight, all-day, later and cancelled Events left out, a hidden calendar, and no Apple Calendar.

## Out of Scope

- Clicking the Next Event to open the Today Widget on it.
- Tomorrow's first Event late in the evening.
- Notifications or reminders before an Event.
- A setting to turn it off.
