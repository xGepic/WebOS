# Spec 0011: Wallpapers

Status: built (2026-11-14)
Related: [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, I look at webOS on every new tab, and it always has the same blue-black background. I want to pick a colour that suits me, without giving up the calm, dark look that keeps the Widgets readable.

## Solution

Settings gets a **Wallpaper** section with five Wallpapers, each shown as a small preview: **Midnight** (the blue one webOS has had until now, and the default), **Aurora** (green), **Ember** (warm orange), **Violet** and **Graphite** (neutral grey). Choosing one changes the Desktop at once, in every open tab, and every new tab opens on it.

## User Stories

1. As a developer, I want to choose the Desktop's background colour, so that webOS feels like mine.
2. As a developer, I want to see each Wallpaper before I choose it, so that I don't have to try them one by one.
3. As a developer, I want every Wallpaper to stay dark, so that the Widgets read as well on each.
4. As a developer, I want a new tab to open straight on my Wallpaper, with no flash of another one.

## Implementation Decisions

- Each Wallpaper is the same design: an almost black base, a coloured light falling from the top centre, and film grain. Only the two colours change, as `--wallpaper-base` and `--wallpaper-light`. Text, glass and the accent stay as they are.
- The core keeps the choice: schema 23 adds `wallpaper`, `midnight` for every existing Desktop. A Wallpaper this build doesn't know, from a newer build, shows as Midnight. It goes into backups.
- The App sets the choice as `data-wallpaper` on `<html>`. The state is in extension storage, which is read too late for the first paint, so the App also keeps a copy in `localStorage`, and `public/wallpaper.js`, loaded in `<head>`, applies it before webOS starts. It is a file because the extension's CSP allows no inline script.
- The colours are set for any element with `data-wallpaper`, not only `<html>`, so Settings previews each one with the page's own CSS.

## Testing Decisions

- The core tests cover the default, choosing and keeping a Wallpaper, following another tab, an unknown Wallpaper, migrating from version 22, and backups.
- How each Wallpaper looks, and the new tab opening without a flash, are checked by hand.

## Out of Scope

- Light Wallpapers, or a light mode.
- Pictures or the user's own images as a Wallpaper.
- Changing the accent colour with the Wallpaper.
