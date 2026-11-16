# Spec 0026: The Analog Clock

Status: built (2026-11-16)
Related: [Spec 0001: webOS v1](0001-webos-v1.md), [Spec 0023: Ambient mode](0023-ambient-mode.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, the Clock Widget shows the time in large thin digits. Sometimes I'd rather see the time the way a wall clock shows it: how much of the hour is gone, at a glance, without reading numbers.

## Solution

Clicking the time on the Clock Widget turns it into an **analog Clock**: a dial of minute and hour marks with an hour hand, a minute hand and a sweeping second hand in the accent colour, between the greeting and the date. Clicking the dial turns it back into digits. The choice is kept, so every new tab opens on the face I chose.

## User Stories

1. As a developer, I want to click the time to see an analog clock, so that I can read the hour at a glance.
2. As a developer, I want to click the clock to get the digits back, so that I can switch whenever I like.
3. As a developer, I want my choice kept for every new tab and followed by the tabs already open, so that I choose once.
4. As a developer, I want the second hand to sweep smoothly, so that the clock feels alive without ticking at me.
5. As a developer who prefers reduced motion, I want no second hand, so that nothing on the Desktop moves all the time.
6. As a developer who uses a screen reader, I want the clock to read out the time and what clicking does, as the digits do.

## Implementation Decisions

- The core keeps the face in the state document's `clockFace`, "digital" or "analog"; one this build doesn't know shows as digital. **Schema 28** adds it as "digital". Backups include it, and one without it is refused as damaged.
- `clock.face()`, `clock.setFace(face)`, and `clock.hands()`, which gives where the hands point in degrees clockwise from 12: the hour hand moves on with the minutes, the minute hand is on the minute, and the second hand is to the millisecond.
- The hour and minute hands follow the core's minute tick, so the minute hand steps once a minute, as the second hand passes 12, like a station clock. The second hand is a 60-second CSS rotation, which the compositor runs, started where the second hand is each time the dial appears and each time the tab is shown again, since a machine that slept may have held the animation back.
- The dial is an SVG with no surface: 60 marks, every fifth longer and brighter, the hands in the type's colour, the second hand and the centre pin in the accent. It takes the height the greeting and date leave, at every size; at S it sits on the left like the digits, at M and L in the middle.
- The time and the dial are each a button named with the time and what clicking does ("9:05 AM. Show an analog clock"). In Edit Mode the Widget is inert, so a click there moves the Widget and doesn't switch the face.
- Ambient mode's clock stays in digits.

## Testing Decisions

- Core tests through the public API: digits by default, keeping the analog face for new tabs and switching back, following another tab, an unknown face showing digits, the migration from schema 27, the face in a backup and a backup without it refused, and the hands at 3:30, a minute and a half later, and at midnight and noon.
- The dial and the second hand's sweep are checked by hand.

## Out of Scope

- Numerals on the dial, and other dial styles.
- An analog clock in Ambient mode or on the World Clock.
- A ticking second hand.
