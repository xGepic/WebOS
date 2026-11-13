# Spec 0005: Calendar Marks

Status: built (2026-11-13)
Related: [Spec 0001: webOS v1](0001-webos-v1.md), [Spec 0002: More Widgets](0002-more-widgets.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, I glance at the Calendar Widget to plan: when the next release is, whether a Friday is a working day, how many working days are left before a race. The Calendar shows only the numbers. My Countdowns are on another Widget, public holidays aren't anywhere, and weekends look like every other day, so I still have to count it out myself.

## Solution

The Calendar Widget marks three things on its days:

- **Weekends** are quieter: Saturday and Sunday are shown in the secondary text colour.
- **Austrian public holidays** are quieter like weekends and get a small grey dot.
- **Countdowns** get a small blue dot on their day.

Hovering a marked day names what is on it ("Christmas Day · Release"), and the day's accessible label says it too. Clicking a day still copies it. There is nothing to set up.

## User Stories

1. As a developer, I want weekends shown quieter than working days, so that I can see the shape of a week at a glance.
2. As a developer in Austria, I want its public holidays marked, so that I see the days I don't work.
3. As a developer, I want holidays shown quieter like weekends, with a dot, so that I can tell a day off from a weekend.
4. As a developer, I want a dot on the days of my Countdowns, so that I see them in the month around them.
5. As a developer, I want to hover a marked day to see its holiday and Countdowns by name, so that I know what the dot means.
6. As a screen reader user, I want a marked day's label to name its holiday and Countdowns, so that I get what the dots show.

## Implementation Decisions

### Core

- `CalendarDay` gains `weekend`, an optional `holiday` (its name) and `countdowns` (the titles on that day, by title). Days of the neighbouring months that fill out the grid are marked too, so December's last week shows New Year's Day.
- `calendar.month(offset)` marks the days; `calendar.monthView` takes the marks as `DayMarks`, so it stays pure.
- Holidays are worked out on the machine in `src/core/time/holidays.ts`, from fixed dates and days counted from Easter Sunday (the anonymous Gregorian algorithm).
- No new state: the holidays are fixed and the Countdowns are already stored. A pre-release build saved a holiday country as schema 18, so **schema 19** drops it; a version 17 document goes straight through.

### Holidays

The 13 public holidays of Austria's Arbeitsruhegesetz: New Year's Day, Epiphany, Easter Monday, Labour Day, Ascension Day, Whit Monday, Corpus Christi, Assumption Day, National Day, All Saints' Day, Immaculate Conception, Christmas Day and St. Stephen's Day.

### Widget

- Weekends and holidays share the class `day-off`, in `--text-secondary`. Today keeps its accent fill; its dots turn `--on-accent`.
- The dots sit under the number: the holiday's first, in `--text-secondary`, then one for any number of Countdowns, in `--accent`.
- The day's `title` and `aria-label` name its holiday, then its Countdowns, joined with " · ".

## Testing Decisions

- As before, tests go through the core's public API only.
- What is tested: weekends; Countdowns on their days, in the neighbouring month's grid too, following edits and deletes; a whole year of holidays; Easter in several years; next year's holidays on the days that fill out December; ordinary days without a holiday.
- The dots and colours are checked by hand.

## Out of Scope

- Other countries, a setting to choose one, and regional holidays.
- Events other than Countdowns, and adding a Countdown from the Calendar.
- Holiday names in German.
