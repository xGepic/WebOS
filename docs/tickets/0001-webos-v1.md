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
              └─ 11 (also needs 07)
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

**Status:** ready-for-agent (needs the user to pick the wallpaper variant)

- [ ] The prototype is a single throwaway page outside the app, with 2–3 wallpaper variants and sample translucent surfaces on each. The user has picked one.
- [ ] The chosen wallpaper is original generated art (SVG/CSS), fixed, and not configurable.
- [ ] Shared material tokens (blur, saturation, tint, border, shadow, corner radius) exist and are the only way surfaces get their translucent look.
- [ ] Inter is bundled with the extension (no remote font loading), with the system font stack as fallback.
- [ ] The app is dark mode only.
- [ ] A motion baseline exists: spring presets built on Motion's framework-agnostic `animate()`, and under `prefers-reduced-motion` they fall back to short opacity fades.
- [ ] The Clock Widget from 01 uses the material and typography and sits on the wallpaper.
- [ ] No Apple fonts, icons or other assets are used.

---

# 03: Desktop grid, Menu Bar and Dock

**What to build:** The new tab looks like an OS. The Clock Widget sits on the Desktop's snap grid in its default position, a Menu Bar runs across the top with the webOS mark and a small 12-hour time readout, and a Dock at the bottom shows icons for the Notes, Dev Utilities and Settings Apps, magnifying subtly on hover. Dock icons don't open anything yet.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The core Desktop module defines the grid, the Widget catalog (Clock for now) with S/M/L sizes as grid spans, and a default layout with every Widget visible.
- [ ] The Desktop fills the viewport with no page scrolling and renders Widgets at their layout positions.
- [ ] The Menu Bar shows the webOS mark on the left and the 12-hour time on the right, using the shared material.
- [ ] The Dock shows the three App icons (original designs) with spring magnification on hover, and no magnification under reduced motion.
- [ ] Core tests: the default layout contains each Widget exactly once and nothing overlaps.

---

# 04: Window and Settings App (name)

**What to build:** Clicking a Dock icon opens that App in the single Window, which springs out of its Dock icon and closes back into it. Settings is the first real App: entering a name makes the Clock Widget greet the user by name ("Good morning, Stefan"). Notes and Dev Utilities open as placeholder Windows.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] A framework-agnostic FLIP-style transition makes the Window spring out of the clicked Dock icon on open and back into it on close (a fade under reduced motion).
- [ ] Only one Window exists at a time. Opening another App replaces the open one.
- [ ] The Window closes with Esc, its close control (original design, not traffic lights), or a click on the Desktop outside it.
- [ ] While an App is open, the Menu Bar shows its name and its Dock icon shows an open indicator.
- [ ] The core Profile module stores the name, and the greeting includes it when set and leaves it out when not.
- [ ] Settings has a name field that saves as you type and persists across tabs.
- [ ] Per-App remembered state has a home in the core's persisted state, ready for later Apps.
- [ ] Core tests: greeting with and without a name, and the name persisting through the in-memory Storage.

---

# 05: Links

**What to build:** The user saves their dev URLs as Links in Link Groups through Settings. The Links Widget on the Desktop shows each Link Group as a section with favicons. Clicking a Link opens it like any browser link.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] The core Links module supports creating, editing, reordering and deleting Link Groups and Links (title, URL, group, order).
- [ ] URL normalisation: a URL without a scheme gets `http://` for `localhost` and IP addresses, and `https://` otherwise.
- [ ] Settings has a Links section for managing Link Groups and Links, including reordering.
- [ ] The Links Widget is added to the Widget catalog and default layout. It shows Link Groups as sections, and each Link with its favicon (via the browser's `favicon` permission) and title.
- [ ] A plain click opens a Link in the current tab. ⌘/Ctrl+click and middle-click open it in a background tab.
- [ ] Links to `localhost` and private IP addresses work.
- [ ] Core tests: normalisation cases, ordering within and across Link Groups, and deleting a Link Group together with its Links.

---

# 06: Docked Links

**What to build:** The user marks favourite Links as Docked in Settings. They appear in the Dock after a divider, following the App icons, with their favicons, and open like any other Link.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] The core Links module supports a docked flag and a separate dock order.
- [ ] In Settings, a Link can be Docked or undocked, and Docked Links can be reordered.
- [ ] The Dock shows Docked Links after a divider, with favicons, taking part in the hover magnification.
- [ ] Open behavior matches the Links Widget (current tab, background tab on ⌘/Ctrl+click or middle-click).
- [ ] Core tests: docking and undocking, dock order independent of group order, and deleting a Docked Link removing it from the Dock.

---

# 07: Todos Widget

**What to build:** A Todos Widget on the Desktop holds one flat list. The user adds a Todo by typing and pressing Enter, checks Todos off, edits, deletes and drag-reorders them. Completed Todos collapse into their own section and clear 3 days after completion.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] The core Todos module supports add, edit text, complete, uncomplete, delete and reorder. Each Todo records its created time and its completion time (if any).
- [ ] A completed Todo is removed once 3 days have passed since its completion time. Unchecking it earlier cancels the removal. Clearing runs when the Desktop loads.
- [ ] The Todos Widget is added to the Widget catalog and default layout, with a quick-add input, a checkbox per Todo, in-place editing, delete, drag-reorder, and a collapsible completed section.
- [ ] Core tests (with the controllable Clock): clearing exactly at the 3-day boundary, cancelling by unchecking, ordering after reorder and after completion.

---

# 08: Notes App

**What to build:** The Notes App lets the user write multiple Markdown Notes: a sidebar listing Notes by last edit, an editor with a sanitised live preview, autosave as you type, and creating and deleting Notes.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] The core Notes module supports creating, editing and deleting Notes, with created and last-edited times.
- [ ] A Note's title is its first non-empty line with Markdown heading markers stripped, or "Untitled" when empty.
- [ ] The sidebar lists Notes most-recently-edited first.
- [ ] The editor autosaves with a short debounce while typing.
- [ ] The live preview is rendered by an established Markdown library and sanitised before display.
- [ ] The selected Note is remembered as per-App state and restored when the Notes App reopens.
- [ ] Core tests: title derivation cases, ordering by last edit, deletion, and remembering the selected Note.

---

# 09: Notes Widget and Pinned Note

**What to build:** The user pins one Note, and the Notes Widget on the Desktop shows a preview of it. Clicking the Widget opens that Note in the Notes App.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] The core Notes module supports pinning and unpinning one Note (pinning another replaces it).
- [ ] Fallback: with no Pinned Note, or after the Pinned Note is deleted, the Widget shows the most recently edited Note.
- [ ] The Notes Widget is added to the Widget catalog and default layout, showing the preview. With no Notes at all, it offers to create one.
- [ ] Clicking the Widget opens the Notes App with that Note selected.
- [ ] The Notes App has a pin/unpin control.
- [ ] Core tests: pin, replace pin, fallback when unpinned, fallback after deleting the Pinned Note, and the empty state.

---

# 10: Dev Utilities App

**What to build:** The Dev Utilities App gives offline tools in tabs: JSON, Base64, JWT, UUID and Timestamp. Every output can be copied in one click, and nothing leaves the machine.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] JSON: validate (showing the line and column of a syntax error), pretty-print and minify.
- [ ] Base64: encode and decode, correct for non-ASCII (UTF-8) text, with URL-safe input and output supported.
- [ ] JWT: decoded header and payload. `exp`, `iat` and `nbf` are shown in local time, with a clear "expired" indicator and a visible note that the signature is not verified.
- [ ] UUID: generate one or many v4 UUIDs.
- [ ] Timestamp: converts Unix timestamps (seconds versus milliseconds auto-detected) to local and ISO dates and back. A "now" button fills in the current time.
- [ ] Every output has a copy button. The active tab is remembered as per-App state.
- [ ] Conversions live in the core as pure functions with no network access.
- [ ] Core tests: JSON error positions, Base64 Unicode and URL-safe round-trips, JWT decoding with expired and not-yet-valid tokens, the UUID v4 format, and timestamp seconds/milliseconds detection and round-trips.

---

# 11: Edit Mode

**What to build:** The user right-clicks the Desktop and chooses "Edit Desktop". Widgets lift and show an outline. The user drags them around the snap grid (other Widgets move aside, and the dragged Widget settles on a spring), resizes them S/M/L, and hides or shows them. "Done" in the Menu Bar or Esc saves the layout.

**Blocked by:** 03, 07

**Status:** ready-for-agent

- [ ] Right-clicking the Desktop shows a menu with "Edit Desktop". This is the only way into Edit Mode.
- [ ] In Edit Mode, Widgets show a gentle lift and outline (no wobble) and normal Widget interactions are paused.
- [ ] Dragging uses a framework-agnostic drag behavior built on Angular CDK drag-drop that settles onto the grid with a spring (a fade under reduced motion).
- [ ] Dropping onto occupied cells pushes other Widgets to the next free position. Widgets never overlap.
- [ ] Each Widget can be resized S/M/L and hidden. Hidden Widgets can be shown again from Edit Mode.
- [ ] The Menu Bar shows "Done" during Edit Mode. "Done" and Esc both exit, and the layout persists across tabs.
- [ ] Core tests: a move with collision resolution, a resize that causes collisions, hide/show, never more than one instance of a Widget, and persistence through the in-memory Storage.

---

# 12: Launcher: core, Apps, Links and web search

**What to build:** The user presses ⌘/Ctrl+K, starts typing on the Desktop, or clicks the Menu Bar Launcher button. The Launcher opens, finds Apps and Links as you type, and always offers "Search Brave for …" last. It's fully keyboard-driven.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] The Launcher opens with ⌘/Ctrl+K, with any printable key while the page has focus and no text field does (the key becomes the first character of the query), or with the Menu Bar Launcher button.
- [ ] The core Launcher module turns a query into ranked results. Kinds are ordered Apps, then Links. Within a kind, case-insensitive matches rank whole-word prefix, then word-start, then substring.
- [ ] The last result is always "Search Brave for <query>".
- [ ] Each result shows its kind label.
- [ ] Arrow keys move the selection and Enter confirms. ⌘/Ctrl+Enter opens Links and web results in a background tab. Esc or a click outside closes the Launcher.
- [ ] Choosing an App opens it in the Window. Choosing a Link opens it in the current tab.
- [ ] Core tests: ranking across kinds and match qualities, the web-search fallback always last, and an empty query.

---

# 13: Launcher: Todos, Notes, bookmarks, history and actions

**What to build:** The Launcher also finds Todos, Notes, browser bookmarks and history, and runs quick actions: "new todo …" adds a Todo, "new note …" creates and opens a Note, and "uuid" copies a fresh UUID.

**Blocked by:** 12, 07, 08

**Status:** ready-for-agent

- [ ] Result kind order becomes: matching actions, Apps, Links, Todos and Notes, bookmarks, history, then web search.
- [ ] Notes rank by recency within equal match quality. Choosing a Note opens it in the Notes App.
- [ ] Choosing a Todo shows the Todos Widget with that Todo highlighted.
- [ ] Bookmarks and history come through an injected browser-lookup edge (real `bookmarks`/`history` APIs in production, a stub in tests) and are capped to a few results each.
- [ ] "new todo <text>" adds a Todo. "new note <text>" creates a Note starting with that text and opens it. "uuid" copies a v4 UUID to the clipboard and shows a brief confirmation.
- [ ] Core tests: the full kind order, the bookmark/history caps, recency tie-breaking, and each action's effect on state.

---

# 14: Backup: export and import

**What to build:** From Settings, the user exports all webOS data to a JSON file and imports it again later or on another machine. Secrets never end up in the file, and a bad file can never damage existing data.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Export downloads one JSON file containing the full state document, leaving out Data Source tokens and cached Data Source payloads.
- [ ] Import asks for confirmation, validates the document, migrates older schema versions, and replaces the current state as a whole.
- [ ] Invalid files and files from a newer schema version are rejected with a clear message, and the current state is not touched.
- [ ] After importing a document that contains Data Sources, the user is told to re-enter their tokens.
- [ ] Core tests: an export/import round-trip preserves state, tokens and caches are left out, invalid and newer-version files are rejected without changes, and older versions are migrated on import.

---

# v2: tentative, don't start

These depend on the user deciding to build the sleep and training APIs. Spec 0001 lists the open questions, including whether the training plan comes from Strava.

## 15: Data Source settings and Sleep Widget

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

## 16: Training Widget

**What to build:** A Training Widget shows the next training session from the user's Training Data Source, refreshed on every new tab.

**Blocked by:** 15

**Status:** tentative

- [ ] The Training Data Source has its own typed adapter, with a default maximum age of 0 (refetch on every open).
- [ ] The Training Widget shows the next session and the same "not connected" and stale states as Sleep.
- [ ] Core tests: the adapter's parsing and the freshness rule.
