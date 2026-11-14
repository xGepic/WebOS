# Spec 0013: Countdowns that count up

Status: built (2026-11-14)
Related: [Spec 0002: More Widgets](0002-more-widgets.md), [Spec 0003: A Leaner Desktop](0003-leaner-desktop.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, I want to see how long ago something happened, such as when I started running or moved, next to what I am counting down to. A Countdown can't do that: one with a day that has passed is cleared when the next tab opens.

## Solution

A Countdown added with a day that has already passed **counts up**: the Countdown Widget shows the days since ("42 days ago") and keeps it. A Countdown that was ahead when it was added is still cleared once its day has passed, as before. The Widget and the Countdowns App list the coming ones first, soonest first, then the ones counting up, the most recent day first.

## User Stories

1. As a developer, I want to add a day that has passed and see the days since, so that I can keep track of how long ago it was.
2. As a developer, I want a race or a release I counted down to to leave the day after, as before, so that the Widget doesn't fill up with what is over.
3. As a developer, I want what is coming first, so that the Widget's large number is still the next thing ahead.

## Implementation Decisions

- A Countdown gains `countsUp`, set when it is added, or changed, with a day before today. Changing it to today or a later day makes it count down again. No schema change: Countdowns from earlier builds have none, and count down.
- `clearPassed`, run as the Desktop loads, keeps Countdowns that count up.
- `countdowns.upcoming()` becomes `countdowns.shown()`. Each view says whether it counts up, with `days` the days since; `relative` reads "Yesterday" or "12 days ago". They come after the coming ones, the most recent first.
- The Widget's unit reads "days ago" or "day ago" for one counting up.

## Testing Decisions

- The core tests cover adding a past day, the order, keeping one that counts up in a new tab while one that was ahead is cleared, changing a Countdown's day either way, and a Countdown for today.

## Out of Scope

- A choice, per Countdown, between counting up and being cleared.
- Counting up in weeks, months or years.
