# Spec 0022: Coming Up in the Today Widget

Status: built (2026-11-15). Later the same day Coming Up stopped following the day shown: it is always the first Event after today. Sunrise and sunset went from the Day View.
Related: [Spec 0007: The Today Widget](0007-today-widget.md), [Spec 0017: The Next Event](0017-next-event.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, the Today Widget shows me my day, but on a quiet day it says "Nothing on this day." and I can't tell what comes next without clicking through the days. I want to see my next Event, and how many days away it is, without looking for it. Copy date at the bottom of the Widget took that room, and I never use it there.

## Solution

The Today Widget shows **Coming Up** under the day's list: the first Event on a day after today, with its calendar's colour bar, "Coming up · in 6 days", its title, and its day and start, e.g. "Fri, Nov 20, 10:00 PM". It stays the same while I step through days. Copy date goes from the Today Widget, and so does the line with sunrise and sunset under it. Clicking a day in the Calendar still copies it while the Today Widget is hidden.

## User Stories

1. As a developer, I want the Today Widget to show my next Event after the day, so that a quiet day still tells me what is ahead.
2. As a developer, I want to see how many days away it is, so that I know at a glance how long I have.
3. As a developer, I want it to stay put while I step through days, so that my next Event is always one glance away.
4. As a developer, I want the days counted from today, so that I know how long I have.
5. As a developer, I want hidden calendars and cancelled Events left out, as everywhere else.

## Implementation Decisions

- `calendar.comingUp()` in the core (`comingUp(apple, now)` in the Apple Calendar module): of the shown calendars' Events, the first that starts on or after midnight tonight. All-day Events start at midnight on their first day, and come first on their day; ties go by title. Today's Events don't count, even those still ahead (the Next Event is in the Menu Bar), and neither does one that started today or earlier and goes on past it.
- It returns the title, `when` ("Tomorrow", "in 6 days", from `relativeDayLabel`), `date` ("Fri, Nov 20, 10:00 PM", or "Fri, Nov 27" for an all-day Event), and the calendar's name and colour.
- It isn't part of the Day View: the Today Widget reads it apart from the day shown and hands it to the Day View, which shows it under the day's list. The core's minute tick moves it on at midnight.
- The Day View no longer shows sunrise and sunset, so it no longer needs the Weather city; `sunOnDay` goes from the core. The Sun Widget is unchanged.
- Only the synced range is known, so there is no Coming Up after its last Event, and none without Apple Calendar. The Day View then shows nothing in its place.
- In a small Today Widget, Coming Up drops its date line and keeps the rest.
- No schema change.

## Testing Decisions

- Core tests through the public API, using the Apple Calendar fixtures: the first Event after today and its days away, "Tomorrow", today's Events and one going on past today left out, an all-day Event's day and its place first on its day, moving on at midnight, a hidden calendar, nothing ahead in the synced range, and no Apple Calendar.
- The layout of the Day View is checked by hand.

## Out of Scope

- Countdowns, holidays and bridge days in Coming Up.
- More than one Event ahead.
- Clicking Coming Up to step the Today Widget to its day.
- Coming Up that follows the day shown.
