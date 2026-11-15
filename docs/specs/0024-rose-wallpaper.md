# Spec 0024: The Rose Wallpaper in place of Graphite

Status: built (2026-11-15)
Related: [Spec 0011: Wallpapers](0011-wallpapers.md), [Spec 0020: The accent follows the Wallpaper](0020-accent-follows-wallpaper.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, I want a pink Wallpaper, and I never choose Graphite: its grey light and accent look flat next to the coloured ones.

## Solution

Settings › Wallpaper offers **Rose** (pink) after Violet, and **Graphite** goes. That leaves five: Midnight, Aurora, Ember, Violet and Rose. Rose is the same design as the others (an almost black base, a coloured light from the top centre, and film grain) and brings its own accent.

## User Stories

1. As a developer, I want a pink Wallpaper, so that I can give the Desktop a warmer mood.
2. As a developer, I want it to stay dark and keep text on the accent easy to read, as the others do.
3. As a developer who had chosen Graphite, I want the Desktop to show Midnight, so that it still opens on a Wallpaper.

## Implementation Decisions

- `wallpapers` drops `graphite` and gains `rose` at the end. No schema change: the choice is stored as text.
- Rose in `wallpaper.css`: base `#0a0307`, light `rgba(235, 90, 160, 0.15)`, accent `#e88ab8`. Text on the accent reads at 8.5:1. The accent is a pink, kept clear of the danger red.
- A stored `graphite` is left as it is and shows as Midnight, as any Wallpaper this build doesn't know does. Choosing a Wallpaper replaces it.
- An older build shows Rose as Midnight, for the same reason.

## Testing Decisions

- The Wallpaper tests list the five, and show Midnight for a stored Graphite. How Rose looks is checked by hand.

## Out of Scope

- Light Wallpapers, pictures, or choosing the accent apart from the Wallpaper.
