# Spec 0009: Notes in the Dock

Status: built (2026-11-14)
Related: [Spec 0003: A Leaner Desktop](0003-leaner-desktop.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, I write Notes in the Notes App, but the only way to it is the Notes Widget, which takes a 3 × 5 place on my Desktop to preview one Note I rarely glance at. Spec 0003 moved Notes out of the Dock to have one way in; I'd rather that one way be the Dock.

## Solution

- The **Notes Widget** is removed. A Desktop that shows it loses it, and the space it held is free.
- The **Notes App** is back in the **Dock**, first: Notes, Clipboard, Dev Utilities, Settings.
- The **Pinned Note** is removed with the Widget: it only chose which Note the Widget previewed. The Notes App loses its pin button; no Note is lost.

## User Stories

1. As a developer, I want to open Notes from the Dock, so that it is one click away without a Widget.
2. As a developer, I want the Notes Widget gone from my Desktop, so that the space is free for Widgets I look at.
3. As a developer, I want every Note kept, so that removing the Widget loses nothing I wrote.

## Implementation Decisions

- The core's App list marks Notes `docked`; the Dock already shows docked Apps in the list's order, and already has the Notes icon.
- The Widget `notes` goes from the Widget definitions and the default layout; a saved layout entry for it is dropped when the layout is loaded, as for any Widget webOS no longer has. The default layout keeps its other places, so a 3 × 5 space is free where Notes was.
- **Schema 22** drops `pinnedNoteId`. The Notes API loses `pin`, `unpin` and `forWidget`, and a listed Note loses `pinned`.
- The pin icon stays: the Clipboard App uses it for pinned Clips.

## Testing Decisions

- Layout tests: the default layout without Notes, and migrated layouts dropping it.
- Notes tests: pinning goes; listing, selecting, editing and deleting stay.
- Migrating a version 21 document drops `pinnedNoteId` and keeps every Note.

## Out of Scope

- Changes to the Notes App itself, beyond the pin button.
