# Spec 0018: Bridge Days

Status: built (2026-11-15)
Related: [Spec 0005: Calendar Marks](0005-calendar-marks.md), [Spec 0007: The Today Widget](0007-today-widget.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer planning time off, I look for the working days that sit between a public holiday and a weekend: taking one off turns a single day of leave into a long weekend. The Calendar marks the holidays, but I still have to spot these days myself, and work out how long the break would be.

## Solution

The Calendar marks every **bridge day**: a working day with a day off on each side, a weekend day or an Austrian public holiday. It gets a hollow dot, and hovering it says "Bridge day: 4 days off". The Day View of a bridge day says how many days off in a row it makes and which, e.g. "4 days off if you take it · Thu, May 14 – Sun, May 17".

## User Stories

1. As a developer, I want the working days between a holiday and a weekend marked in the Calendar, so that I can plan leave without searching for them.
2. As a developer, I want to see how many days off in a row a bridge day makes, and which, so that I can choose the best one.
3. As a developer, I want bridge days found across the turn of the year, so that one before New Year's Day isn't missed.
4. As a developer, I want a bridge day to look different from a holiday, so that I never mistake a working day for a day off.

## Implementation Decisions

- `bridgeDays(year)` in `holidays.ts`: each day of the year from Monday to Friday that isn't a public holiday, with a weekend day or a public holiday on the day before and the day after. The days off around it are counted on both sides, into the year before or after, so Christmas 2029's Monday makes 5 days, Sat 22 – Wed 26. Worked out once per year and kept.
- Only a single working day counts. Two working days between days off, such as the Thursday and Friday after a Wednesday holiday, aren't bridge days.
- `CalendarDay` gains `bridge`, the days off it makes, and `CalendarDayView` gains `bridge: { days, span }`, the span as "Thu, May 14 – Sun, May 17".
- The Calendar shows a bridge day as a working day, at full strength, with the holiday's dot hollow; on today, the ring is in the accent's text colour. The Day View lists it first, with the holiday's bar hollow.
- No schema change: bridge days are worked out, like the holidays.

## Testing Decisions

- Core tests through the public API: every bridge day of 2026, with the days off; weekends, holidays and other working days left unmarked; the Day View's days and span; a break of 5 days; one on 31 December before New Year's Day, and one on 2 January after it.

## Out of Scope

- Stretches of two or more working days between days off.
- Days off other than weekends and public holidays, such as 24 and 31 December, school holidays or the user's own leave.
- Another country's holidays.
