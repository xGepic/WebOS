# Spec 0020: The accent follows the Wallpaper

Status: built (2026-11-15)
Related: [Spec 0011: Wallpapers](0011-wallpapers.md), [GLOSSARY](../../GLOSSARY.md)
Changed by: [Spec 0024](0024-rose-wallpaper.md), which adds Rose and removes Graphite.

## Problem Statement

As a developer, I chose the Ember Wallpaper for its warm light, but today in the Calendar, the Done button, the Countdown dots and every focus ring stay Midnight's blue. On every Wallpaper but Midnight, the accent clashes with the light behind it.

## Solution

Each Wallpaper brings its own accent: **Midnight** keeps its blue, **Aurora** is green, **Ember** orange, **Violet** purple and **Graphite** a light neutral grey. Everything drawn in the accent follows it: buttons such as Done, today in the Calendar, the Countdown dots and bars, selected and switched-on controls, focus rings, and Edit Mode's outlines. Settings shows each Wallpaper's accent as a dot in its preview.

## User Stories

1. As a developer, I want the accent to match my Wallpaper, so that the Desktop looks like one design.
2. As a developer, I want to see a Wallpaper's accent before I choose it, so that I know what I will get.
3. As a developer, I want text on the accent to stay easy to read on every Wallpaper, so that buttons and today's date never get harder to see.
4. As a developer, I want added and removed lines in a diff to stay blue and red, so that they never look alike.
5. As a developer, I want a new tab to open in my Wallpaper's accent, with no flash of the blue one.

## Implementation Decisions

- Each Wallpaper rule in `wallpaper.css` sets `--accent` next to its base and light: Midnight `#6f8fdc`, Aurora `#4cc4a0`, Ember `#e58a55`, Violet `#9a7ee8`, Graphite `#b4bac6`.
- The accent's tints, `--focus-ring` (60%), `--selected-fill` (10%) and `--edit-outline` (45%), are worked out from `--accent` with `color-mix()`, on `:root` and on any element with `data-wallpaper`, so a Settings preview gets its own Wallpaper's.
- `--on-accent`, for text and marks on the accent, is the Wallpaper's own near-black base. Every accent is light enough for it to read clearly on, at a contrast of 6.4:1 (Violet) to 10.1:1 (Graphite).
- The Diff tab's added lines use a new `--diff-added`, Midnight's blue on every Wallpaper, next to the danger red for removed lines. On Ember an orange added line would read too close to a red removed one.
- The glass, the Dock icons and Apple Calendar's fallback calendar colour stay as they are.
- The accent comes with `data-wallpaper`, which `public/wallpaper.js` sets before webOS starts, so it is right from the first paint. No core or schema change.

## Testing Decisions

- No core change, so no new core tests. Each Wallpaper's accent, the text on it, and the first paint of a new tab are checked by hand.

## Out of Scope

- Choosing the accent apart from the Wallpaper.
- Tinting the glass, the Dock icons or the text with the Wallpaper.
