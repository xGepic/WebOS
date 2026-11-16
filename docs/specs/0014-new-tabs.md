# Spec 0014: The New Tabs Widget

Status: built (2026-11-15). On 2026-11-16 pointing at a bar came to show its day's count in place of today's, instead of a tooltip.
Related: [Spec 0002: More Widgets](0002-more-widgets.md), [Spec 0012: The Top Sites Widget](0012-top-sites.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, I open dozens of new tabs a day, often without a reason: out of habit, between two thoughts, instead of doing the next thing. I have no idea how many, or whether a scattered day looks different from a focused one. webOS opens on every one of those tabs, so it is the one place that could tell me.

## Solution

webOS counts each new tab as its Desktop opens. A **New Tabs Widget** shows today's count large, like the Countdown's days, over seven bars: today and the six days before it, today's bar in the accent colour. It is honest and quiet: no goal, no warning, just the number.

## User Stories

1. As a developer, I want to see how many new tabs I have opened today, so that I notice when I'm scattered.
2. As a developer, I want to see the last seven days side by side, so that I can tell a busy day from a normal one.
3. As a developer, I want a reload not to count, so that the number means tabs I opened.
4. As a developer, I want counting to go on while the Widget is hidden, so that the days are there when I show it.
5. As a developer, I want every open tab's Widget to follow the count, so that an old tab never shows a stale number.
6. As a developer, I want to point at a bar to see how many new tabs I opened that day, so that I can read the week, not just its shape.
7. As a developer who uses a screen reader, I want each day's count read out with its date, so that the bars aren't only a picture.

## Implementation Decisions

- The core counts a new tab with `newTabs.count()` and shows them with `newTabs.view()`, in the activity area beside Recent and Top Sites. The Angular layer counts once as the core starts, unless the page was reloaded or came back through the browser's history (the Navigation Timing type). The count is made whether or not the Widget is on the Desktop.
- **New Tabs** are counted per local day, as `2026-11-15`, and saved in the state document's `newTabs`. Only today and the six days before it are kept; older days are dropped with the next count. Schema 24 adds `newTabs: {}`. Backups include them.
- Each count saves the state document, so the other open tabs take it on and their Widget follows. Two tabs opened in the same instant may be counted as one, as the store saves whole documents; that is close enough.
- The view gives today's count, and the seven days oldest first, each with its weekday's letter, its date as "Thu, Nov 12", its count and whether it is today. A count that isn't a whole number from 0 up, as from a hand-edited backup, reads as 0. Past midnight the Widget starts the new day at 0 without a new tab opening, as the view is made from the clock.
- The Widget `new-tabs` is S 3 × 2, M 3 × 3 and L 6 × 3, like the Countdown. A fresh Desktop shows it at S beside Recent, under the Calendar (column 15, row 3); an existing Desktop gets it hidden, for Edit Mode to show.
- The bars are scaled to the busiest of the seven days. A day without new tabs shows a thin line, so the week keeps its shape. Pointing at a bar shows its day's count and date in place of today's ("12 Thu, Nov 12"), and brightens the bar and its letter, until the pointer leaves the bars; each bar's date and count are also in screen-reader text; the weekday letters hide when the Widget is too short for them. It opens no App.

## Testing Decisions

- The core tests cover counting today, the seven days with their letters, dates and order, starting a new day at midnight, dropping days older than six days, ignoring counts that aren't whole numbers, following another tab's count, the migration from schema 23, and New Tabs in backups: kept when restoring, and a backup without them refused as damaged.
- The layout tests include New Tabs: on a fresh Desktop beside Recent, and hidden on existing ones.
- Not counting reloads, and the Widget at every size, on 1920 × 1080 and 1366 × 768, are checked by hand.

## Out of Scope

- Counting every tab the browser opens, such as links opened in a new tab. That needs a background worker and the `tabs` events; webOS only knows the tabs it opens in.
- Goals, limits, streaks or warnings.
- More than seven days, averages or a week-on-week comparison.
- Time spent on tabs or sites.
