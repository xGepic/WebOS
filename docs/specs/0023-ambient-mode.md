# Spec 0023: Ambient mode

Status: built (2026-11-15)
Related: [Spec 0011: Wallpapers](0011-wallpapers.md), [Spec 0015: Wallpaper Weather](0015-wallpaper-weather.md), [Spec 0017: The Next Event](0017-next-event.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, I often leave a new tab open on a second screen or while I step away. The full Desktop then sits there with every Widget lit, which is busy for something nobody is looking at. From across the room I'd rather see the time, large and calm, like a screensaver.

## Solution

**Ambient mode**: after the Desktop has been left alone for five minutes, the Menu Bar, Widgets, Window and Dock fade away. A large thin clock shows over the Wallpaper with the date, the weather and the Next Event, and the Wallpaper Weather goes on falling behind it. The pointer is hidden. Any key, click, scroll or move of the pointer brings the Desktop back. The key, click or scroll that wakes it does nothing else. Settings › Ambient mode chooses after 1, 5 or 15 minutes, or turns it off.

## User Stories

1. As a developer, I want a Desktop I've left alone to fade to a large clock, so that an idle screen is calm and readable from afar.
2. As a developer, I want to see the date, the weather and my Next Event with it, so that a glance still tells me what matters.
3. As a developer, I want the Wallpaper and its weather to stay, so that it still feels like webOS.
4. As a developer, I want anything I do to bring the Desktop back at once, without that first key or click doing something by accident, so that waking it is safe.
5. As a developer, I want to choose how soon it starts, or turn it off, so that it suits how I work.
6. As a developer, I want coming back to the tab to show the Desktop, not the clock, so that switching to it is never a step more.

## Implementation Decisions

- The core keeps the choice: schema 27 adds `ambientAfter`, minutes (1, 5 or 15) or null for off, 5 for every existing Desktop. Minutes this build doesn't offer, from a newer build, count as 5. It goes into backups. The Desktop API gets `ambient.after()`, `ambient.setAfter()` and `ambient.choices`.
- Whether Ambient mode is on is UI state, per tab: `AmbientMode` in the Angular layer. It notes the last key, press, scroll or pointer move (in the capture phase, on `window`), and checks every 5 seconds whether the chosen minutes have passed. A hidden tab never starts it. Showing the tab again counts as activity, so it ends Ambient mode.
- While it is on, the key, press or scroll that ends it is stopped in the capture phase (`preventDefault`, `stopImmediatePropagation`), so it reaches nothing else. So are the release and click of that press. Moving the pointer only ends it.
- The App wraps the Menu Bar, Desktop, Window, Dock and Toast in one `.shell`, which fades to 0 over 1.2 s and comes back in 0.3 s. They are all fixed, so the wrapper takes no room, and fading them as one keeps their stacking order during the fade. The Ambient screen (`webos-ambient`) fades in on top, dimming the Wallpaper by a quarter, with `cursor: none`. Under reduced motion, both fade in 0.15 s.
- The Ambient screen shows only what the Desktop already says: the time, the date, the weather ("12° Partly cloudy") once it is ready, and the Next Event. It is `aria-hidden`.
- Edit Mode and an open Window stay as they were underneath, and are there again on waking.

## Testing Decisions

- Core tests through the public API: the default and choices, keeping the minutes or off, following another tab, unknown minutes, migrating from version 26, backups, and a backup without it refused as damaged.
- The idle timing, waking without side effects, and the fade are checked by hand.

## Out of Scope

- Moving the clock to avoid burn-in.
- Starting it at a time of day, or by a keyboard shortcut.
- Other faces, such as the Forecast or the Today Widget.
