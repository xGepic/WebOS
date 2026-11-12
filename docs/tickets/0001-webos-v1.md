# Tickets: webOS v1

Source: [Spec 0001: webOS v1](../specs/0001-webos-v1.md)
Vocabulary: [GLOSSARY](../../GLOSSARY.md). Decisions: [ADR-0001](../adr/0001-angular-over-react.md)

Each ticket is a tracer-bullet vertical slice: core logic, tests through the webOS core seam, and UI, demoable on its own. Tickets are numbered in dependency order. Pick up any ticket whose blockers are all done.

## Dependency overview

```
01 ─ 02 ─ 03 ─┬─ 04 ─┬─ 05 ─┬─ 06
              │      │      └─ 12 ─┐
              │      ├─ 08 ─┬─ 09  │
              │      │      └──────┼─ 13
              │      ├─ 10         │
              │      └─ 14         │
              ├─ 07 ───────────────┘
              └─ 11 (also needs 07) ─ 15 ─ 16
```

After 04, tickets 05, 07, 08, 10 and 14 can run in parallel.

---

# 01: Extension skeleton, core seam and Clock Widget

**What to build:** Opening a new tab in Brave shows webOS: a Clock Widget with the current time in 12-hour format, today's date, and a greeting by time of day, on a plain background. Underneath, this sets up the foundations every later ticket builds on: the Angular extension (see ADR-0001), the framework-free webOS core with its injected Storage and Clock edges, the versioned state document, and the test setup.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The extension is Manifest V3, overrides the new tab, and loads unpacked in Brave without errors.
- [x] Angular uses standalone components, signals and zoneless change detection. The production build has critical-CSS inlining and output hashing turned off, and runs under the default extension Content Security Policy with no CSP errors in the console.
- [x] The webOS core contains no Angular imports. It is created with an injected Storage (local extension storage in production, in-memory in tests) and an injected Clock (real time in production, controllable in tests).
- [x] Persisted state is one document carrying a schema version. On load, a migration runner brings older versions forward step by step. A first test proves a v0 → v1 migration path works.
- [x] Vitest runs the core tests from a single command.
- [x] The Clock Widget shows the 12-hour time (updating every minute, on the minute), the date and a greeting: morning 05:00–11:59, afternoon 12:00–16:59, evening 17:00–21:59, night otherwise.
- [x] Greeting tests cover every boundary using the controllable Clock.

---

# 02: Wallpaper and materials

**What to build:** webOS gets its visual identity. A throwaway prototype shows 2–3 variants of the dark indigo/violet-into-teal mesh-gradient wallpaper with film grain, each with sample translucent surfaces on top (a Widget, a Dock strip, a Window). The user picks one. The chosen wallpaper becomes the fixed Desktop background, and the shared material tokens, typography and motion baseline land in the app.

**Blocked by:** 01

**Status:** done

**Prototype:** branch `prototype/0002-wallpaper` holds the three variants (A Nebula, B Aurora, C Eclipse). The user picked **C · Eclipse**: near-black indigo, one large violet-into-teal bloom bottom-left, heavy vignette, heavy dark glass.

- [x] The prototype is a single throwaway page outside the app, with 2–3 wallpaper variants and sample translucent surfaces on each. The user has picked one.
- [x] The chosen wallpaper is original generated art (SVG/CSS), fixed, and not configurable.
- [x] Shared material tokens (blur, saturation, tint, border, shadow, corner radius) exist and are the only way surfaces get their translucent look.
- [x] Inter is bundled with the extension (no remote font loading), with the system font stack as fallback.
- [x] The app is dark mode only.
- [x] A motion baseline exists: spring presets built on Motion's framework-agnostic `animate()`, and under `prefers-reduced-motion` they fall back to short opacity fades.
- [x] The Clock Widget from 01 uses the material and typography and sits on the wallpaper.
- [x] No Apple fonts, icons or other assets are used.

---

# 03: Desktop grid, Menu Bar and Dock

**What to build:** The new tab looks like an OS. The Clock Widget sits on the Desktop's snap grid in its default position, a Menu Bar runs across the top with the webOS mark and a small 12-hour time readout, and a Dock at the bottom shows icons for the Notes, Dev Utilities and Settings Apps, magnifying subtly on hover. Dock icons don't open anything yet.

**Blocked by:** 02

**Status:** done

- [x] The core Desktop module defines the grid, the Widget catalog (Clock for now) with S/M/L sizes as grid spans, and a default layout with every Widget visible.
- [x] The Desktop fills the viewport with no page scrolling and renders Widgets at their layout positions.
- [x] The Menu Bar shows the webOS mark on the left and the 12-hour time on the right, using the shared material.
- [x] The Dock shows the three App icons (original designs) with spring magnification on hover, and no magnification under reduced motion.
- [x] Core tests: the default layout contains each Widget exactly once and nothing overlaps.

---

# 04: Window and Settings App (name)

**What to build:** Clicking a Dock icon opens that App in the single Window, which springs out of its Dock icon and closes back into it. Settings is the first real App: entering a name makes the Clock Widget greet the user by name ("Good morning, Stefan"). Notes and Dev Utilities open as placeholder Windows.

**Blocked by:** 03

**Status:** done

- [x] A framework-agnostic FLIP-style transition makes the Window spring out of the clicked Dock icon on open and back into it on close (a fade under reduced motion).
- [x] Only one Window exists at a time. Opening another App replaces the open one.
- [x] The Window closes with Esc, its close control (original design, not traffic lights), or a click on the Desktop outside it.
- [x] While an App is open, the Menu Bar shows its name and its Dock icon shows an open indicator.
- [x] The core Profile module stores the name, and the greeting includes it when set and leaves it out when not.
- [x] Settings has a name field that saves as you type and persists across tabs.
- [x] Per-App remembered state has a home in the core's persisted state, ready for later Apps.
- [x] Core tests: greeting with and without a name, and the name persisting through the in-memory Storage.

---

# 05: Links

**What to build:** The user saves their dev URLs as Links in Link Groups through Settings. The Links Widget on the Desktop shows each Link Group as a section with favicons. Clicking a Link opens it like any browser link.

**Blocked by:** 04

**Status:** done

- [x] The core Links module supports creating, editing, reordering and deleting Link Groups and Links (title, URL, group, order).
- [x] URL normalisation: a URL without a scheme gets `http://` for `localhost` and IP addresses, and `https://` otherwise.
- [x] Settings has a Links section for managing Link Groups and Links, including reordering.
- [x] The Links Widget is added to the Widget catalog and default layout. It shows Link Groups as sections, and each Link with its favicon (via the browser's `favicon` permission) and title.
- [x] A plain click opens a Link in the current tab. ⌘/Ctrl+click and middle-click open it in a background tab.
- [x] Links to `localhost` and private IP addresses work.
- [x] Core tests: normalisation cases, ordering within and across Link Groups, and deleting a Link Group together with its Links.

---

# 06: Docked Links

**What to build:** The user marks favourite Links as Docked in Settings. They appear in the Dock after a divider, following the App icons, with their favicons, and open like any other Link.

**Blocked by:** 05

**Status:** done

- [x] The core Links module supports a docked flag and a separate dock order.
- [x] In Settings, a Link can be Docked or undocked, and Docked Links can be reordered.
- [x] The Dock shows Docked Links after a divider, with favicons, taking part in the hover magnification.
- [x] Open behavior matches the Links Widget (current tab, background tab on ⌘/Ctrl+click or middle-click).
- [x] Core tests: docking and undocking, dock order independent of group order, and deleting a Docked Link removing it from the Dock.

---

# 07: Todos Widget

**What to build:** A Todos Widget on the Desktop holds one flat list. The user adds a Todo by typing and pressing Enter, checks Todos off, edits, deletes and drag-reorders them. Completed Todos collapse into their own section and clear 3 days after completion.

**Blocked by:** 03

**Status:** done

- [x] The core Todos module supports add, edit text, complete, uncomplete, delete and reorder. Each Todo records its created time and its completion time (if any).
- [x] A completed Todo is removed once 3 days have passed since its completion time. Unchecking it earlier cancels the removal. Clearing runs when the Desktop loads.
- [x] The Todos Widget is added to the Widget catalog and default layout, with a quick-add input, a checkbox per Todo, in-place editing, delete, drag-reorder, and a collapsible completed section.
- [x] Core tests (with the controllable Clock): clearing exactly at the 3-day boundary, cancelling by unchecking, ordering after reorder and after completion.

**Decisions made while building:** the completed section lists the most recently completed first. Alt+↑/↓ on a Todo's text reorders it without a mouse. Blank text is ignored when adding, and an edit saved blank keeps the old text. A tab left open is only cleared on its next load.

---

# 08: Notes App

**What to build:** The Notes App lets the user write multiple Markdown Notes: a sidebar listing Notes by last edit, an editor with a sanitised live preview, autosave as you type, and creating and deleting Notes.

**Blocked by:** 04

**Status:** done

- [x] The core Notes module supports creating, editing and deleting Notes, with created and last-edited times.
- [x] A Note's title is its first non-empty line with Markdown heading markers stripped, or "Untitled" when empty.
- [x] The sidebar lists Notes most-recently-edited first.
- [x] The editor autosaves with a short debounce while typing.
- [x] The live preview is rendered by an established Markdown library and sanitised before display.
- [x] The selected Note is remembered as per-App state and restored when the Notes App reopens.
- [x] Core tests: title derivation cases, ordering by last edit, deletion, and remembering the selected Note.

**Decisions made while building:**
- Creating a Note selects it.
- When the selected Note is deleted, or none has been chosen yet, the most recently edited Note is shown.
- Each tab keeps showing its own Note. Selecting a Note is remembered for the next opening in any tab, but it doesn't swap the Note open in another tab. Edits from another tab appear in the open editor unless typed text is waiting to be saved.
- Text typed into a Note that another tab deleted is kept as a new Note.
- An edit that leaves the text unchanged doesn't count as an edit, so the Note keeps its place in the list.
- The editor saves 400 ms after typing stops, and straight away on blur, when switching Notes, when the Window closes, or when the page is hidden or left.
- Each Note in the sidebar shows when it was last edited.
- Deleting a Note that has text asks first; an empty Note is deleted straight away.
- The title rule follows CommonMark: `#text` without a space is not a heading, and closing `#`s are stripped only from headings. A line that is only heading markers counts as empty.
- The preview removes styles as well as scripts, so a Note can't restyle the page. Remote images in a Note still load: it is the user's own text.

---

# 09: Notes Widget and Pinned Note

**What to build:** The user pins one Note, and the Notes Widget on the Desktop shows a preview of it. Clicking the Widget opens that Note in the Notes App.

**Blocked by:** 08

**Status:** done

- [x] The core Notes module supports pinning and unpinning one Note (pinning another replaces it).
- [x] Fallback: with no Pinned Note, or after the Pinned Note is deleted, the Widget shows the most recently edited Note.
- [x] The Notes Widget is added to the Widget catalog and default layout, showing the preview. With no Notes at all, it offers to create one.
- [x] Clicking the Widget opens the Notes App with that Note selected.
- [x] The Notes App has a pin/unpin control.
- [x] Core tests: pin, replace pin, fallback when unpinned, fallback after deleting the Pinned Note, and the empty state.

**Decisions made while building:**
- The Pinned Note is stored as `pinnedNoteId` (schema v7). Any change that leaves the Pinned Note gone clears it, and pinning an id that isn't a Note is ignored. A pin left pointing at a Note another tab deleted falls back like no pin.
- Text recovered from a Note deleted in another tab becomes a new Note, so it isn't pinned even if the deleted Note was.
- The Widget is placed at medium size (4 × 4) below the Todos Widget, and has the same sizes as the Links Widget.
- The Widget's caption reads "Pinned" for the Pinned Note, otherwise when the Note was edited.
- The Widget's preview is not interactive: a click anywhere opens the Note, rather than following a link inside it.
- The Widget's "New Note" opens the Notes App on a new, empty Note.
- The Notes App marks the Pinned Note in its sidebar with a pin.

---

# 10: Dev Utilities App

**What to build:** The Dev Utilities App gives offline tools in tabs: JSON, Base64, JWT, UUID and Timestamp. Every output can be copied in one click, and nothing leaves the machine.

**Blocked by:** 04

**Status:** done

- [x] JSON: validate (showing the line and column of a syntax error), pretty-print and minify.
- [x] Base64: encode and decode, correct for non-ASCII (UTF-8) text, with URL-safe input and output supported.
- [x] JWT: decoded header and payload. `exp`, `iat` and `nbf` are shown in local time, with a clear "expired" indicator and a visible note that the signature is not verified.
- [x] UUID: generate one or many v4 UUIDs.
- [x] Timestamp: converts Unix timestamps (seconds versus milliseconds auto-detected) to local and ISO dates and back. A "now" button fills in the current time.
- [x] Every output has a copy button. The active tab is remembered as per-App state.
- [x] Conversions live in the core as pure functions with no network access.
- [x] Core tests: JSON error positions, Base64 Unicode and URL-safe round-trips, JWT decoding with expired and not-yet-valid tokens, the UUID v4 format, and timestamp seconds/milliseconds detection and round-trips.

**Decisions made while building:**
- JSON is parsed by a small parser in the core, not `JSON.parse`. Error positions don't depend on the browser, and pretty-printing or minifying keeps every number and string exactly as written (`12345678901234567890` keeps its digits).
- JSON is checked as you type. Pretty and Minified are a toggle, not one-off buttons.
- Base64 decoding accepts standard and URL-safe input, with or without padding, and ignores line breaks. Bytes that aren't UTF-8 text are reported rather than shown garbled.
- A JWT can be pasted with a "Bearer" prefix. It counts as expired from its `exp` second on, and the "Expired" check is re-run every minute. A time claim that is not a number of seconds, or is too far from 1970 to be a date, is shown as such rather than hidden.
- Timestamps below 100,000,000,000 are read as seconds, at or above it as milliseconds. A date without an offset, date-only included, is read as local time, and a local time skipped by a clock change is refused. The Local form the tab shows can be typed back in. The Timestamp tab has one field that takes either.
- JSON nested more than 1000 levels deep is reported instead of being parsed.
- Dates are shown in English 12-hour form, like the rest of webOS.
- Up to 100 UUIDs at a time.
- Every tool stays rendered while the App is open, so switching tabs keeps each tool's input. Only the active tab is remembered between openings, not the inputs: they may hold tokens.
- The `clipboardWrite` permission is added for the copy buttons. The App placeholder is removed, since every App now exists.

---

# 11: Edit Mode

**What to build:** The user right-clicks the Desktop and chooses "Edit Desktop". Widgets lift and show an outline. The user drags them around the snap grid (other Widgets move aside, and the dragged Widget settles on a spring), resizes them S/M/L, and hides or shows them. "Done" in the Menu Bar or Esc saves the layout.

**Blocked by:** 03, 07

**Status:** done

- [x] Right-clicking the Desktop shows a menu with "Edit Desktop". This is the only way into Edit Mode.
- [x] In Edit Mode, Widgets show a gentle lift and outline (no wobble) and normal Widget interactions are paused.
- [x] Dragging uses a framework-agnostic drag behavior built on Angular CDK drag-drop that settles onto the grid with a spring (a fade under reduced motion).
- [x] Dropping onto occupied cells pushes other Widgets to the next free position. Widgets never overlap.
- [x] Each Widget can be resized S/M/L and hidden. Hidden Widgets can be shown again from Edit Mode.
- [x] The Menu Bar shows "Done" during Edit Mode. "Done" and Esc both exit, and the layout persists across tabs.
- [x] Core tests: a move with collision resolution, a resize that causes collisions, hide/show, never more than one instance of a Widget, and persistence through the in-memory Storage.

**Decisions made while building:**
- The layout is stored as one entry per Widget: size, position and whether it is visible (schema v8). Every change is saved at once, so "Done" and Esc only leave Edit Mode. Edit Mode itself is UI-only state in the Angular layer, like the open Window.
- Collision resolution: Widgets the moved or resized one doesn't touch stay put. Those it covers move, in reading order, to the next free position from where they were, wrapping round to the top. A move or resize that would leave one of them no room anywhere is refused: nothing changes, a dropped Widget springs back, and the Menu Bar says why. The user's chosen sizes are never changed by a push. (All four Widgets at L need more cells than the grid has.)
- Showing a hidden Widget doesn't push anything aside. It goes where it was, or to the next free position. With no room for it, the Menu Bar says so.
- A stored layout is made safe on load and when another tab's arrives: unknown and repeated entries are dropped, Widgets it doesn't mention are added hidden, and overlaps are resolved. Only here may a Widget be made smaller, or hidden, to fit.
- The Desktop menu opens only on the empty Desktop or the wallpaper around it (or with the keyboard's menu key), so right-clicking inside a Widget keeps the browser's own menu. It closes on Esc, a click elsewhere or tabbing out, and focus goes back where it was; leaving Edit Mode does the same.
- In Edit Mode each Widget has S/M/L and Hide controls and is keyboard-focusable: the arrow keys move it one cell. Hidden Widgets are offered back as chips in the Menu Bar, beside "Done".
- The drag is a directive (`webosGridDrag`) on Angular CDK drag-drop that reports grid cells; the grid geometry and the settle animation are framework-agnostic helpers in `src/motion/grid.ts`. While dragging, the cell the Widget will land on is outlined. The dropped Widget springs from where it was let go (momentum preset), and Widgets pushed aside slide to their places (smooth). The drag moves the Widget's grid slot and the animations an element inside it, so a new drag never fights a slide still settling. Under reduced motion Widgets fade in at their new places, and the Edit Mode outline fades in instead of the lift.
- Opening an App leaves Edit Mode.

---

# 12: Launcher: core, Apps, Links and web search

**What to build:** The user presses ⌘/Ctrl+K, starts typing on the Desktop, or clicks the Menu Bar Launcher button. The Launcher opens, finds Apps and Links as you type, and always offers "Search Brave for …" last. It's fully keyboard-driven.

**Blocked by:** 05

**Status:** done

- [x] The Launcher opens with ⌘/Ctrl+K, with any printable key while the page has focus and no text field does (the key becomes the first character of the query), or with the Menu Bar Launcher button.
- [x] The core Launcher module turns a query into ranked results. Kinds are ordered Apps, then Links. Within a kind, case-insensitive matches rank whole-word prefix, then word-start, then substring.
- [x] The last result is always "Search Brave for <query>".
- [x] Each result shows its kind label.
- [x] Arrow keys move the selection and Enter confirms. ⌘/Ctrl+Enter opens Links and web results in a background tab. Esc or a click outside closes the Launcher.
- [x] Choosing an App opens it in the Window. Choosing a Link opens it in the current tab.
- [x] Core tests: ranking across kinds and match qualities, the web-search fallback always last, and an empty query.

**Decisions made while building:**
- "Whole-word prefix" means the name starts with the query; "word-start" means a later word in it does (words are split at anything that isn't a letter or digit); "substring" means the query is anywhere in it. Equal matches keep their order: Apps as in the Dock, Links as in their Link Groups.
- Apps match on their name and Links on their title, not their URL. A Link's result shows its URL beside the title.
- An empty or all-spaces query finds nothing, not even the web search; the Launcher shows a hint instead. Spaces around a query are ignored.
- The Brave search is `https://search.brave.com/search?q=<query>`. Its kind label is "Web"; Apps and Links read "App" and "Link".
- ⌘/Ctrl+K toggles the Launcher, from anywhere on the page, text fields included. Space doesn't open it (it presses the focused button), but AltGr characters such as "@" on a German keyboard do. Keys typed before the field has taken focus still land in the query.
- The arrow keys stop at the first and last result rather than wrapping. Typing selects the first result again. Moving the pointer over a result selects it, and a click chooses it; ⌘/Ctrl+click and middle-click act like ⌘/Ctrl+Enter.
- ⌘/Ctrl+Enter on an App just opens it. A background tab opens right beside webOS's tab, through `chrome.tabs.create`, which needs no new permission.
- The Launcher sits above the Window and Edit Mode. Esc closes only the Launcher, not what's under it, and focus goes back where it was. Tab, and a click anywhere in the Launcher, leave focus in the field while it's open, so the keys keep working. Choosing an App replaces the open one, and leaves Edit Mode as opening any App does.
- The Launcher springs in (a fade under reduced motion) and closes at once.

---

# 13: Launcher: Todos, Notes, bookmarks, history and actions

**What to build:** The Launcher also finds Todos, Notes, browser bookmarks and history, and runs quick actions: "new todo …" adds a Todo, "new note …" creates and opens a Note, and "uuid" copies a fresh UUID.

**Blocked by:** 12, 07, 08

**Status:** done

- [x] Result kind order becomes: matching actions, Apps, Links, Todos and Notes, bookmarks, history, then web search.
- [x] Notes rank by recency within equal match quality. Choosing a Note opens it in the Notes App.
- [x] Choosing a Todo shows the Todos Widget with that Todo highlighted.
- [x] Bookmarks and history come through an injected browser-lookup edge (real `bookmarks`/`history` APIs in production, a stub in tests) and are capped to a few results each.
- [x] "new todo <text>" adds a Todo. "new note <text>" creates a Note starting with that text and opens it. "uuid" copies a v4 UUID to the clipboard and shows a brief confirmation.
- [x] Core tests: the full kind order, the bookmark/history caps, recency tie-breaking, and each action's effect on state.

**Decisions made while building:**
- `launcher.search` is async now: the core asks the injected `BrowserLookup` edge (`browser` in the core's edges, optional so a core without it finds no pages) for bookmarks and history. If the lookup fails, the Launcher still finds everything else. `launcher.run` runs an action and says what it did; opening Apps, Notes, Todos and pages stays in the Angular layer.
- Todos and Notes are one kind, ranked together by match. Between equal matches, Todos come first in list order, then Notes, most recently edited first. Only open Todos are found. A Note is found by its title, or, ranked below every title match, by text anywhere in it. A Note's result shows when it was last edited.
- Bookmarks and history are capped at 3 each. They rank by their title's match, and a page the browser found only by its URL ranks below those. History breaks ties by the most recent visit. An untitled page is titled by its URL. A page already shown, as a Link or a bookmark, isn't shown again (URLs are compared in their normalised form, so `github.com` matches `https://github.com/`). Bookmarklets are left out. History is searched over all time, not the browser's default last 24 hours.
- Actions: "new todo <text>" ("Add Todo "…""), "new note <text>" ("New Note "…""; on its own it makes an empty Note) and "uuid" ("Copy a new UUID"). Command words ignore case and runs of spaces; the text keeps its case. "uuid" followed by more text is a search, not the action.
- An action appears only once its whole command word is typed, so "new" still finds a Link called "News" first. "new todo" with no text yet is offered as "new todo …"; choosing it fills in the command for the text to be typed, and doesn't run. The Launcher's placeholder names the three commands, so they can be found.
- Choosing a Todo closes the Window, leaves Edit Mode, shows the Todos Widget if it was hidden (or says there's no room for it), then scrolls the Todo into view, focuses it and highlights it for 2.4 seconds.
- Confirmations are a toast under the Menu Bar: "UUID copied" (or that copying failed), and "Added "…" to Todos", so a Todo added while the Todos Widget is hidden or covered isn't silent.
- Enter pressed before the search for what was just typed has finished waits for it, so a fast "new todo milk⏎" adds the Todo instead of choosing a result for an earlier query. Typing more before the results arrive cancels that Enter. Running an action closes the Launcher first, so a second Enter can't run it twice.
- A chosen Note is selected before the Notes App opens on it. A Todo highlight the Todos Widget doesn't take within a second is dropped.
- "uuid" generates its UUID with the Dev Utilities' UUID generator.
- Result kind labels: Action, App, Link, Todo, Note, Bookmark, History, Web. Bookmarks and history show favicons and their URL.
- The `bookmarks` and `history` permissions are added to the manifest. The production bundle is now 507 kB, just over Angular's 500 kB warning budget; it loads from disk, so the budget was left as it is.

---

# 14: Backup: export and import

**What to build:** From Settings, the user exports all webOS data to a JSON file and imports it again later or on another machine. Secrets never end up in the file, and a bad file can never damage existing data.

**Blocked by:** 04

**Status:** done (the Data Source parts are carried to ticket 17)

- [x] Export downloads one JSON file containing the full state document. (There are no Data Sources yet, so no tokens or cached payloads to leave out; ticket 17 adds that.)
- [x] Import asks for confirmation, validates the document, migrates older schema versions, and replaces the current state as a whole.
- [x] Invalid files and files from a newer schema version are rejected with a clear message, and the current state is not touched.
- [ ] After importing a document that contains Data Sources, the user is told to re-enter their tokens. Carried to ticket 17: v1 has no Data Sources.
- [x] Core tests: an export/import round-trip preserves state, invalid and newer-version files are rejected without changes, and older versions are migrated on import. (Tokens and caches being left out is carried to ticket 17.)

**Decisions made while building:**
- The backup file is the state document itself, as indented JSON, named `webos-backup-YYYY-MM-DD.json` after the local date. It downloads through the browser, so no `downloads` permission is needed.
- Import asks first, after the file is chosen: "Replace all your webOS data with "…"? … export first if you might want what you have now." The file is checked when the import runs; a file that can't be used says why ("Nothing was imported. This file …"), and nothing changes.
- A file is rejected when it isn't JSON, isn't a JSON object, has no schema version or version 0, has an invalid or newer schema version, is missing part of the document, has a Link Group, Link, Docked Link, Todo or Note without the fields webOS reads, or has two Link Groups, Links, Todos or Notes with the same id. Stored state from before schema versions counts as version 0 and migrates to empty data, so a file is never read that way: it would wipe everything. The layout isn't checked item by item: it is made safe on import, as on every load.
- Imported Link URLs are normalised as if typed in Settings, so a hand-edited `example.com` still opens.
- Errors about a backup say "This file …"; errors about stored state still say "The stored state …".
- An imported layout is made safe like any other: overlapping Widgets are resolved. A pin or Docked Link pointing at nothing is left as it is, since reads already skip it. Completed Todos older than 3 days are cleared on the next load, as usual.
- The import is saved before the tab takes it on, so if saving fails nothing changes, here or in storage.
- The importing tab, and any tab opened afterwards, shows the Note the backup remembers. A tab already open shows the most recently edited Note, as after any deletion of the Note it was showing. The import saves at once, so other open tabs take it on like any other change. Text another tab was still typing into a Note is saved after the import arrives, as the Notes App always saves it: into that Note, or as a new Note if the backup doesn't have it.

---

# 15: Stage layout, Midnight Deep and Title Bars

**What to build:** webOS gets a calmer, darker and centred design. A new tab opens on the Stage layout: a very large, thin clock and greeting across the top, and Links, Todos and Notes as three equal Widgets in a row beneath it. Everything uses the Midnight Deep palette, and every Widget except the Clock has a Title Bar with its name. Existing Desktops move to the Stage layout once.

**Blocked by:** 11

**Status:** done

**Prototype:** built inside the app (variants switched in place, the saved layout untouched) and not kept. It went through black-and-white looks, then whole designs with different arrangements (Stage, Rail, Bento, Split), then palettes on Stage. The user picked **Stage** in **Midnight Deep**, with a thin clock and a Title Bar on each Widget (rather than a coloured bar on each Dock icon). This replaces ticket 02's Eclipse wallpaper.

- [x] Midnight Deep replaces Eclipse: the design tokens, the wallpaper (near-black, a faint blue light from the top, film grain) and the App icons, which now share one look and differ by their symbol.
- [x] The Clock's L size is the full width (12 × 3); M for Links, Todos and Notes is 4 × 5. The default layout is Stage, which fills the grid.
- [x] The Clock has no surface and a thin time; at L it centres a very large time.
- [x] Links, Todos and Notes have a Title Bar.
- [x] The Desktop's grid is centred and at most 1180 px wide.
- [x] Schema version 9 moves every saved layout to Stage once, keeping hidden Widgets hidden.
- [x] Core tests: the default layout is Stage and fills the grid; on the full Desktop, Widgets of the same size swap, and a move or resize with no room is refused; a v8 layout moves to Stage once. The Edit Mode tests start from a layout with free cells, since the default no longer has any.

**Decisions made while building:**
- Widgets lie flat (no shadow). The Window, the Launcher, the Desktop menu and toasts use `.material-raised`, which casts `--raised-shadow`, so they still lift off the Desktop.
- The Clock never has a surface or a Title Bar, at any size.
- Link rows are slightly tighter, so ten Links in three Link Groups fit under the Title Bar at 1440 × 900. Longer lists scroll, as before.
- The production bundle is 514 kB, still just over Angular's 500 kB warning budget; left as it is, as in ticket 13.

---

# 16: Weather and Calendar Widgets

**What to build:** Two new Widgets join the Stage layout's top band, either side of the Clock: Weather (the current temperature in °C for a city chosen in Settings, the condition with an icon, today's high and low) and Calendar (the current month, weeks starting Monday, today marked). Existing Desktops move to the new layout once.

**Blocked by:** 15

**Status:** done

- [x] The core gains its injected Fetch edge (the network in production, a stub in tests), first used by Weather.
- [x] Weather comes from Open-Meteo directly: the forecast for the chosen city's coordinates, and geocoding for the city search. `host_permissions` covers those two hosts only. Weather is not a Data Source.
- [x] Settings › Weather: search for a city, pick one of up to five matches (with region and country), or remove it.
- [x] The last report is stored and shown at once; a new tab fetches it again once it is 30 minutes old. A failed fetch keeps the last report, and says when it is from once it is over an hour old.
- [x] The Calendar Widget shows the current month, filled out with the neighbouring months' days, and moves on at midnight.
- [x] The Stage layout's top band is Weather (S, 3 × 3), the Clock (M, now 6 × 3) and Calendar (S, 3 × 3). All three have no surface and no Title Bar. Schema version 10 moves every Desktop to it once, keeping hidden Widgets hidden, and adds the weather to the state document.
- [x] Backup keeps the city and leaves out the cached report; an import drops any report in the file.
- [x] Core tests: city search, the report and its conditions, the 30-minute rule, one fetch at a time, keeping the last report on failure, an unreadable response, changing and removing the city, weather from another tab, backup; the Calendar's weeks, neighbouring days, today and the change of month; the new default layout and the v9 → v10 migration.

**Decisions made while building:**
- The Clock is centred at M and L, and left-aligned only at S.
- When the city changes while the old city's forecast is still on its way, the old answer is ignored and the new city's weather is fetched as soon as it arrives, without waiting for another tab.
- Requests time out after 10 seconds and send no cookies. Coordinates are sent to 4 decimal places.
- A clear night shows a moon, using the forecast's day/night flag.
- The Edit Mode tests' starting layout uses a small Clock, now that the Clock's M is 6 × 3, and keeps Weather and Calendar hidden.
- The production bundle is 530 kB, still over Angular's 500 kB warning budget; left as it is.

---

# v2: tentative, don't start

These depend on the user deciding to build the sleep and training APIs. Spec 0001 lists the open questions, including whether the training plan comes from Strava.

## 17: Data Source settings and Sleep Widget

**What to build:** The user adds their Sleep Data Source in Settings (HTTPS URL on their own domain, a bearer token and a maximum age). A Sleep Widget shows last night's sleep immediately from cache and refreshes in the background when the cache is older than the maximum age. The Menu Bar status dot shows whether data is fresh.

**Blocked by:** 03, 04

**Status:** tentative

- [ ] The core gains an injected Fetch edge (network in production, a stub in tests).
- [ ] The core Data Sources module stores the URL, token, maximum age (default 60 minutes for Sleep), last payload, last fetch time and last error.
- [ ] `host_permissions` covers only the user's domain. The token is sent as a bearer `Authorization` header and is stored only in local storage.
- [ ] Stale-while-revalidate runs on new-tab open only, with no background polling. A failed or timed-out refresh keeps the cached payload and marks it stale.
- [ ] The Sleep Widget has a typed adapter and shows a "not connected" state linking to Settings until its first successful load.
- [ ] Menu Bar status dot: hidden with no Data Sources, green when all are fresh, amber when any is stale or failing.
- [ ] Core tests: serving from cache, refetching only past the maximum age, stale on failure, and the aggregate status.
- [ ] Carried from ticket 14: a backup export leaves out Data Source tokens and cached payloads, and after importing a document that contains Data Sources the user is told to re-enter their tokens. Core tests for both.

## 18: Training Widget

**What to build:** A Training Widget shows the next training session from the user's Training Data Source, refreshed on every new tab.

**Blocked by:** 17

**Status:** tentative

- [ ] The Training Data Source has its own typed adapter, with a default maximum age of 0 (refetch on every open).
- [ ] The Training Widget shows the next session and the same "not connected" and stale states as Sleep.
- [ ] Core tests: the adapter's parsing and the freshness rule.
