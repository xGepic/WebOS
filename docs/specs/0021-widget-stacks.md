# Spec 0021: Widget Stacks

Status: built (2026-11-15)
Related: [Spec 0001: webOS v1](0001-webos-v1.md), [Spec 0002: More Widgets](0002-more-widgets.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, I want more Widgets than the Desktop has room for. Moon, Sun and New Tabs are each worth a glance, but not worth a place each, so today I hide some of them and lose them altogether.

## Solution

Widgets that cover the same cells can share one place as a **stack**, like the stacks on a phone's home screen. A stack shows one of its Widgets at a time. Scrolling or swiping over it moves to the next, snapping to each, and dots along its right edge show where it is and go straight to a Widget. A new tab opens each stack on the Widget it showed last.

In Edit Mode, each Widget has **Stack…**: choose it, then **Stack here** on the Widget to stack it onto; the Widgets it can't go onto step back, and Esc cancels. The place it leaves is free. A stack moves and resizes as one. **Unstack** takes the Widget it shows out, to the next free place, and **Hide** hides only that Widget. A stack left with one Widget is that Widget on its own again.

## User Stories

1. As a developer, I want to stack Widgets in one place, so that I can keep more Widgets than the Desktop has room for.
2. As a developer, I want to move through a stack by scrolling or swiping, so that switching feels like the rest of the Desktop.
3. As a developer, I want dots that show which Widget a stack shows and go straight to any of them, so that I always know where I am.
4. As a developer, I want a new tab to open each stack where I left it, so that I see what I chose.
5. As a developer, I want a list inside a stacked Widget, such as Todos, to scroll itself and not the stack, so that I never change Widget by accident.
6. As a developer in Edit Mode, I want to choose which Widget to stack onto, seeing only those that fit, so that I can't make a stack that breaks the layout.
7. As a developer in Edit Mode, I want to move, resize, unstack and hide as I do with any Widget, so that I don't have to learn a new way.
8. As a developer, I want picking a day in the Calendar to turn a stack holding Today to it, so that the day always shows.

## Implementation Decisions

### Core

- A stack is the layout entry of the visible Widget at its place, with the Widgets stacked with it in `stacked` and the Widget it shows in `shown`. The stacked Widgets' own entries aren't visible, keep the stack's size and place for when they leave, and aren't hidden Widgets: Edit Mode never offers to show them. So the grid's moves, pushing aside and overlap rules are unchanged.
- Only Widgets that cover the same cells at the stack's size can share it: at S, for example, World Clock, Countdown, Moon, Sun, System, Top Sites and New Tabs (3 × 2), or Todos, Weather, Calendar, Recent and Today (3 × 3). A stack resizes only to a size all its Widgets share.
- `desktop.layout()` gives a stack its Widgets in order (`stack`) and the one it shows (`shown`). The Desktop API gains `stack(widget, onto)`, `canStack(widget, onto)`, `unstack(widget)` and `showInStack(widget)`. Stacking a stack onto another brings all of it. `move`, `resize` and `hide` take any Widget in a stack: the first two act on the stack, `hide` only on that Widget. `show` refuses a stacked Widget.
- Taking out the Widget at a stack's place leaves the next one there. Taking out the one shown shows the one after it, or the last.
- The saved layout is made safe whenever it is read, so a stack holds only known Widgets that aren't on the Desktop, aren't in another stack, and cover its cells; a hidden stack is broken up, hiding its Widgets. No schema change: a layout without stacks is one with none, and an older build sees stacked Widgets as hidden ones.

### Desktop

- `WidgetStack` renders a stack: a vertical scroll-snapping list with every Widget alive, so switching is instant. The Widgets not shown are inert. When it comes to rest, the Widget it rests on is saved as shown. A Widget's own lists have `overscroll-behavior: contain`, so they never hand their scrolling on to the stack. Moving to a Widget by a dot, another tab or Edit Mode scrolls smoothly, and jumps under reduced motion.
- The Desktop renders every Widget from one template, for a Widget on its own and for each Widget in a stack.
- In Edit Mode the outline names the Widget shown and its place in the stack ("Moon · 2 of 3"), and the stack's dots switch it. Stack… shows only when another Widget can take it. While choosing, dragging is off, the Widgets that take it get the accent outline and Stack here, and the rest are dimmed. Sizes not every Widget in a stack has are disabled.

## Testing Decisions

- Core tests through the public API: stacking onto a Widget of the same size; adding to a stack and stacking a stack onto another; refusing another size, the same Widget or a hidden one; `canStack`; showing a Widget and opening on it in a new tab; moving and resizing as one, refusing a size not all share; unstacking, from the stack's own place and the Widget shown; hiding only one Widget, down to a stack of one; never showing a stacked Widget a second time; and saved stacks with Widgets that can't be in them, in two stacks, or hidden.
- Scrolling, snapping, the dots and Edit Mode's choosing are checked by hand.

## Out of Scope

- Turning a stack on its own, by time of day or what is happening ("smart" stacks).
- Reordering the Widgets in a stack.
- Stacking by dragging one Widget onto another: that swaps them, as before.
