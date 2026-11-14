# Spec 0007: The Today Widget

Status: built (2026-11-14). Later the same day Today M grew to 4 × 5, as wide as the Calendar M, with Todos one column further right on a fresh Desktop; a Desktop saved before keeps Today in place and moves Todos on.
Related: [Spec 0006: Apple Calendar and the Day View](0006-apple-calendar.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, what I want at a glance on a new tab is my day: what's on today. With Spec 0006 that is one click away, inside the Calendar, and it takes the month away while I look at it. I want today always in view, and the month next to it.

## Solution

A **Today Widget** shows the **Day View** of today: its holiday, Countdowns, Apple Calendar events, and sunrise and sunset. The Calendar Widget goes back to showing only the month.

The two work together: clicking a day in the Calendar shows it in the Today Widget and rings it in the month; ‹ Today, clicking the day again, Esc, or the Calendar's Today goes back to today. The Calendar's Today shows while a day is picked, too, not only on another month. ‹ and › in the Today Widget step through days, and the Calendar follows to their month. With the Today Widget hidden, clicking a day copies it, as before Spec 0006.

## User Stories

1. As a developer, I want my day always on the Desktop, so that I see it without a click.
2. As a developer, I want to click a day in the Calendar and see it in the Today Widget, with the month still in view, so that I can look ahead without losing my place.
3. As a developer, I want the picked day ringed in the Calendar, so that I see which day the Today Widget shows.
4. As a developer, I want one click back to today, so that browsing never leaves it showing another day by accident.
5. As a developer, I want the Today Widget to move on to the new day at midnight, unless I picked a day, so that it is right in the morning.
6. As a developer, I want clicking a day to copy it when the Today Widget is hidden, so that the Calendar still does something useful.

## Implementation Decisions

- The core gains the Widget `today` (S 3 × 3, M 3 × 5, L 4 × 6). A fresh Desktop shows it at M in the 3 × 5 slot under the World Clock; an existing Desktop gets it hidden, for Edit Mode to show. No schema change: a layout without it gets it hidden when loaded.
- The picked day is UI state, per tab, in the Angular layer (`SelectedDay`): none means today, so the Widget follows the date. Every new tab starts on today.
- The Day View moves from the Calendar to the Today Widget unchanged, except that its way back is ‹ Today, shown only on another day, and it no longer takes focus when it appears.
- The Calendar rings the picked day (`.picked`), marks it `aria-pressed`, and shows its month whenever it changes.

## Testing Decisions

- The layout tests include the Today Widget: on a fresh Desktop, and hidden on migrated ones.
- The link between the Calendar and the Today Widget is UI state, checked by hand.

## Out of Scope

- A Today Widget for another day than today by default, or several of them.
- Adding events or Countdowns from the Today Widget.
