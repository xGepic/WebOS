# Spec 0022: Coming Up in the Today Widget

Status: built (2026-11-15)
Related: [Spec 0007: The Today Widget](0007-today-widget.md), [Spec 0017: The Next Event](0017-next-event.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, the Today Widget shows me my day, but on a quiet day it says "Nothing on this day." and I can't tell what comes next without clicking through the days. I want to see my next Event, and how many days away it is, without looking for it. Copy date at the bottom of the Widget took that room, and I never use it there.

## Solution

The Day View shows **Coming Up** under the day's list: the first Event on a later day than the one shown, with its calendar's colour bar, "Coming up · in 6 days", its title, and its day and start, e.g. "Fri, Nov 20, 10:00 PM". Copy date goes from the Today Widget. Clicking a day in the Calendar still copies it while the Today Widget is hidden.

## User Stories

1. As a developer, I want the Today Widget to show my next Event after the day, so that a quiet day still tells me what is ahead.
2. As a developer, I want to see how many days away it is, so that I know at a glance how long I have.
3. As a developer, I want it to follow the day I step to, so that I can see what comes after any day.
4. As a developer, I want the days counted from today, as the Day View's "in 3 days" is, so that the two never disagree.
5. As a developer, I want hidden calendars and cancelled Events left out, as everywhere else.

## Implementation Decisions

- `comingUp(apple, date, now)` in the core's Apple Calendar module: of the shown calendars' Events, the first that starts on or after midnight after `date`. All-day Events start at midnight on their first day, and come first on their day; ties go by title. An Event that started on or before `date` and goes on past it doesn't count: the Day View already lists it.
- It returns the title, `when` ("Tomorrow", "in 6 days", counted from today with `relativeDayLabel`), `date` ("Fri, Nov 20, 10:00 PM", or "Fri, Nov 27" for an all-day Event), and the calendar's name and colour.
- The Day View (`calendar.day(date)`) carries it as `comingUp`, so the Today Widget gets it in the one call it already makes.
- Only the synced range is known, so there is no Coming Up after its last Event, and none without Apple Calendar. The Day View then shows nothing in its place.
- In a small Today Widget, Coming Up drops its date line and keeps the rest.
- No schema change.

## Testing Decisions

- Core tests through the public API, using the Apple Calendar fixtures: the first Event on a later day and its days from today, "Tomorrow", following the day shown, an Event going on past the day shown left out, an all-day Event first on its day, a hidden calendar, past the synced range, and no Apple Calendar.
- The layout of the Day View is checked by hand.

## Out of Scope

- Countdowns, holidays and bridge days in Coming Up.
- More than one Event ahead.
- Clicking Coming Up to step the Today Widget to its day.
