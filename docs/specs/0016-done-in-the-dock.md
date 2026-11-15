# Spec 0016: Done in the Dock

Status: built (2026-11-15)
Related: [Spec 0001: webOS v1](0001-webos-v1.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer finishing Edit Mode, I have to aim for "Done", a small chip at the far right of the thin Menu Bar. It's slow to hit, and it's far from the Widgets I was just moving.

## Solution

In Edit Mode the Dock holds a large "Done" instead of its App icons, at the bottom centre where the Dock always is. "Done" leaves the Menu Bar, which keeps the hidden Widgets and any notice.

## User Stories

1. As a developer in Edit Mode, I want a large "Done" at the bottom centre of the screen, so that I can leave Edit Mode quickly.
2. As a developer, I want the Dock's icons back as soon as I leave Edit Mode, so that nothing else changes.

## Implementation Decisions

- The Dock shows "Done" in place of its icons while `DesktopEditor.editing()` is true. The App icons aren't missed: opening an App leaves Edit Mode anyway.
- "Done" is as tall as an App icon, at least three and a half icons wide, in the accent colour. It fades and grows in on the smooth spring as Edit Mode starts, and only fades under reduced motion.
- Esc still leaves Edit Mode.
- UI only: no core or schema change.

## Testing Decisions

- No core change, so no new core tests. Typecheck and build cover the views.

## Out of Scope

- Leaving Edit Mode by clicking the empty Desktop.
