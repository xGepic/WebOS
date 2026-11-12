# Spec 0001: webOS v1

Status: ready to build
Related: [GLOSSARY](../../GLOSSARY.md), [ADR-0001 Angular instead of React](../adr/0001-angular-over-react.md)

## Problem Statement

As a developer, I open dozens of new tabs a day, and each one shows a page I never use. The things I actually need are scattered: the localhost ports and dashboards of the apps I'm working on, a scratchpad for half-formed thoughts, a short list of things to do today, and small utilities like decoding a JWT or converting a timestamp, each on a different website. Later I also want my own personal data, such as last night's sleep and my next marathon training session, in the same place instead of in separate apps. I want one beautiful, calm place for all of this that feels like an operating system rather than another web dashboard.

## Solution

webOS is a personal Brave extension that replaces the new tab with a Desktop that looks and feels like a desktop operating system. Its design follows Apple's principles (translucent materials, depth, spring motion, restrained typography) but has its own identity.

Every new tab opens on the Desktop: one fixed, almost black wallpaper with glanceable Widgets on a snap grid. By default they are arranged as the Stage layout: a top band of Weather, a large thin clock with the greeting, and the month's Calendar, with Links, Todos and a Pinned Note preview in a row beneath it. A Menu Bar runs across the top and a Dock across the bottom. The Dock opens Apps (Notes, Dev Utilities, Settings) in a single focused Window that springs out of its Dock icon. The Dock also holds Docked Links. A keyboard-driven Launcher finds and opens anything: Apps, Links, Todos, Notes, browser bookmarks and history, falling back to Brave Search. It also runs quick actions. Everything except the weather works offline, and everything is stored locally. A later version may add Data Sources, which are the user's own APIs for sleep and training data, each shown in its own Widget.

## User Stories

### Desktop and appearance

1. As a developer, I want every new tab to open on the webOS Desktop, so that my tools are one keystroke away all day.
2. As a developer, I want the Desktop to appear instantly from local data, so that opening a tab never feels slower than the browser's default.
3. As a developer, I want one fixed, almost black wallpaper with a faint blue light from the top and subtle grain ("Midnight Deep"), so that webOS is calm and my content stands out.
4. As a developer, I want Widgets, the Menu Bar, the Dock and the Window to use translucent materials tinted by the wallpaper, so that the interface has depth and feels like an OS.
5. As a developer, I want webOS to be dark mode only, so that it is consistent and easy on the eyes.
6. As a developer, I want motion to use interruptible springs, so that interactions feel physical and responsive rather than scripted.
7. As a developer who has turned on reduced motion, I want springs replaced by simple fades, so that the interface respects my accessibility settings.
8. As a developer, I want the layout to use the full browser viewport without page scrolling, so that the Desktop feels like a screen and not a web page.
9. As a developer, I want every Widget except the Clock to show a thin Title Bar with its name, so that I can tell the Widgets apart at a glance.

### Menu Bar

10. As a developer, I want a Menu Bar across the top of the Desktop, so that the interface reads as an operating system.
11. As a developer, I want the Menu Bar to show the webOS mark and the name of the currently open App, so that I always know where I am.
12. As a developer, I want a Launcher button in the Menu Bar, so that I can open the Launcher with the mouse, including on a fresh tab where the address bar has focus.
13. As a developer, I want a small 12-hour time readout in the Menu Bar, so that I can see the time even when a Window covers the Clock Widget.
14. As a developer, I want a Data Source status dot in the Menu Bar, green when all Data Sources are fresh and amber when any is stale or failing, so that I know whether the data I see can be trusted (v2; hidden when no Data Sources exist).
15. As a developer in Edit Mode, I want a "Done" button in the Menu Bar, so that I can leave Edit Mode with the mouse.

### Dock

16. As a developer, I want a Dock at the bottom of the Desktop with an icon for each App, so that I can open Apps with one click.
17. As a developer, I want Docked Links shown after a divider in the Dock, so that my most-used sites are always one click away.
18. As a developer, I want Docked Links to show their site's favicon, so that I can recognise them at a glance.
19. As a developer, I want the Dock icons to magnify subtly as my pointer moves over them, with spring motion, so that the Dock feels alive.
20. As a developer, I want the Dock icon of the open App to show an indicator, so that I can see which App is open.
21. As a developer, I want to choose which Links are Docked and in what order, so that the Dock reflects my habits.
22. As a developer, I want clicking a Docked Link to open it in the current tab, and ⌘/Ctrl+click or middle-click to open it in a background tab, so that it behaves like any link in the browser.

### Window and Apps

23. As a developer, I want an App to open in a single focused Window that springs out of its Dock icon, so that opening an App feels like an OS.
24. As a developer, I want opening a second App to replace the current one in the Window, so that I never have to manage multiple windows.
25. As a developer, I want to close the Window with Esc, a close control, by clicking the Desktop around it, or by clicking the open App's Dock icon again, so that I can get back to my Widgets quickly.
26. As a developer, I want the Window to spring back into its Dock icon when closed, so that I understand where it went.
27. As a developer, I want the Window's controls to be webOS's own design, not copies of macOS traffic lights, so that webOS has its own identity.
28. As a developer, I want each App to remember its internal state (for example the selected Note or the active Dev Utilities tab) between openings, so that I can pick up where I left off.

### Edit Mode

29. As a developer, I want to enter Edit Mode by right-clicking the Desktop and choosing "Edit Desktop", so that I can rearrange my Desktop without changing anything by accident during normal use.
30. As a developer in Edit Mode, I want Widgets to lift slightly and show an outline, so that I can see they are editable without a tiring wobble.
31. As a developer in Edit Mode, I want to drag Widgets around a snap grid, settling into place on a spring, so that the Desktop stays tidy.
32. As a developer in Edit Mode, I want other Widgets to move aside when I drop a Widget onto an occupied area, so that Widgets never overlap.
33. As a developer in Edit Mode, I want to resize each Widget between small, medium and large, so that more important Widgets can take more space.
34. As a developer in Edit Mode, I want to hide a Widget and show it again later, so that the Desktop only shows what I care about.
35. As a developer, I want at most one of each Widget on the Desktop, so that the Desktop stays simple.
36. As a developer, I want to leave Edit Mode with Esc or the "Done" button, so that my layout is saved and the Desktop returns to normal.
37. As a developer, I want my layout to persist across tabs and browser restarts, so that I arrange my Desktop only once.
38. As a first-time user, I want a sensible default layout with all v1 Widgets visible (the Stage layout: Weather, the Clock and Calendar across the top, Links, Todos and Notes in a row beneath it), so that webOS is useful immediately and looks calm.
39. As a developer updating from an earlier webOS, I want my Desktop moved to the newest Stage layout once, with hidden Widgets kept hidden, so that I get the new design and new Widgets without losing anything.

### Clock Widget

40. As a developer, I want a Clock Widget showing the time in thin type in 12-hour format and today's date, with the greeting larger and the time very large and centred in the middle of the top band, so that I can see both at a glance.
41. As a developer, I want the Clock Widget to greet me by name based on the time of day ("Good morning, Stefan"), so that webOS feels personal.
42. As a developer, I want to set my name once in Settings, so that the greeting uses it.
43. As a developer who hasn't set a name, I want a greeting without a name, so that the Widget still reads naturally.

### Links

44. As a developer, I want to save Links with a title and URL, so that my dev URLs (localhost ports, dashboards, docs) are in one place.
45. As a developer, I want to organise Links into named Link Groups, so that related Links appear together.
46. As a developer, I want the Links Widget to show each Link Group as a section, so that I can scan them quickly.
47. As a developer, I want to add, edit, reorder and delete Links and Link Groups in the Settings App, so that the Links Widget stays clean.
48. As a developer, I want Links to show their site's favicon, so that I can recognise them.
49. As a developer, I want Links to `localhost` and other non-public URLs to work, so that I can reach my local dev servers.
50. As a developer, I want clicking a Link to open it in the current tab, and ⌘/Ctrl+click or middle-click to open it in a background tab, so that it behaves like a normal link.
51. As a developer, I want to mark a Link as Docked, so that it also appears in the Dock.
52. As a developer, I want a URL without a scheme to be saved with `https://`, or `http://` for `localhost` and IP addresses, so that quick entries just work.

### Todos

53. As a developer, I want a Todos Widget with one flat list, so that I can keep track of today's small tasks without a task manager.
54. As a developer, I want to add a Todo by typing in the Widget and pressing Enter, so that capturing a task takes a second.
55. As a developer, I want to complete a Todo by checking it off, so that I can see my progress.
56. As a developer, I want to uncheck a completed Todo, so that I can undo a mistake.
57. As a developer, I want to delete a Todo, so that the list holds only real tasks.
58. As a developer, I want to reorder Todos by dragging, so that the most important one is on top.
59. As a developer, I want completed Todos collapsed into a "completed" section, so that the open list stays focused.
60. As a developer, I want completed Todos cleared automatically 3 days after completion, so that the list never grows forever.
61. As a developer, I want to edit a Todo's text in place, so that I can fix typos.

### Notes

62. As a developer, I want a Notes App where I can write multiple Notes in Markdown, so that I have a scratchpad for ideas, snippets and meeting notes.
63. As a developer, I want a sidebar listing my Notes, most recently edited first, so that I can switch between them quickly.
64. As a developer, I want a Note's title taken from its first line, so that I never have to name Notes separately.
65. As a developer, I want a live Markdown preview, so that code blocks, lists and headings read nicely.
66. As a developer, I want Notes to save automatically as I type, so that I never lose anything.
67. As a developer, I want to create and delete Notes, so that I can manage my scratchpad.
68. As a developer, I want to choose one Pinned Note, so that its preview appears on the Notes Widget.
69. As a developer, I want the Notes Widget to show a preview of the Pinned Note, and to open it in the Notes App on click, so that my most important Note is always visible.
70. As a developer without a Pinned Note, I want the Notes Widget to show my most recently edited Note, so that the Widget is never empty when Notes exist.
71. As a developer with no Notes, I want the Notes Widget to offer to create one, so that I know what it's for.

### Weather and Calendar

72. As a developer, I want a Weather Widget showing the current temperature in °C for my city, the condition in words with an icon, and today's high and low, so that I know what it's like outside at a glance.
73. As a developer, I want to choose my city in Settings by searching and picking from up to five matches with their region and country, so that an ambiguous name like "Vienna" finds the right place.
74. As a developer, I want the weather shown instantly from the last result and fetched again in the background once it is 30 minutes old, so that a new tab never waits for the network.
75. As a developer without a network, I want the Weather Widget to keep the last weather, saying when it is from once it is over an hour old, so that a network hiccup doesn't empty it.
76. As a developer without a city, I want the Weather Widget to offer to choose one in Settings, so that I know what it's for.
77. As a developer, I want a Calendar Widget showing the current month in weeks starting on Monday, with ISO week numbers and today marked, so that I can see the date in context at a glance.
78. As a developer, I want to browse earlier and later months with ‹ and ›, and a Today button to return to the current month while another one is shown, with every new tab starting on the current month, so that I can look ahead without losing today.
79. As a developer, I want clicking a day to copy it as `2026-11-30`, with a brief confirmation, so that I can paste dates into tickets, configs and queries.
80. As a developer, I want to move through the Calendar with the arrow keys (by day and week) and Page Up and Page Down (by month), and copy with Enter, so that it works without the mouse.

### Launcher

81. As a developer, I want to open the Launcher with ⌘/Ctrl+K once the Desktop has focus, so that everything is reachable from the keyboard.
82. As a developer, I want typing a printable character while the Desktop has focus (and no text field does) to open the Launcher with that character, so that I can just start typing.
83. As a developer, I want the Launcher to search Apps, then Links, then Todos and Notes, then browser bookmarks and history, so that my own things come first.
84. As a developer, I want the last Launcher result to always be "Search Brave for …", so that the Launcher never dead-ends.
85. As a developer, I want matching to be case-insensitive and to favour matches at the start of a word, so that short queries find what I mean.
86. As a developer, I want to move through results with the arrow keys and confirm with Enter, so that I never have to touch the mouse.
87. As a developer, I want ⌘/Ctrl+Enter on a Link, bookmark or history result to open it in a background tab, so that the Launcher matches normal link behavior.
88. As a developer, I want selecting an App result to open that App, so that the Launcher can replace the Dock.
89. As a developer, I want selecting a Note result to open it in the Notes App, so that I can jump straight into a Note.
90. As a developer, I want selecting a Todo result to show the Todos Widget with that Todo highlighted, so that I can act on it.
91. As a developer, I want a "new todo <text>" action that adds a Todo directly, so that I can capture tasks from anywhere.
92. As a developer, I want a "new note <text>" action that creates a Note starting with that text and opens it, so that I can capture ideas instantly.
93. As a developer, I want a "uuid" action that copies a new UUID to the clipboard and confirms it briefly, so that I can get an ID in one step.
94. As a developer, I want Esc or clicking outside to close the Launcher, so that it gets out of the way.
95. As a developer, I want each result to show its kind (App, Link, Todo, Note, Bookmark, History, Action, Web), so that I know what selecting it will do.

### Dev Utilities

96. As a developer, I want a Dev Utilities App with tabs for JSON, Base64, JWT, UUID and Timestamp, so that common conversions are always at hand offline.
97. As a developer, I want to paste JSON and get it validated, pretty-printed or minified, with the location of any syntax error, so that I can inspect API responses.
98. As a developer, I want to encode and decode Base64, including non-ASCII text and URL-safe Base64, so that I can inspect encoded values correctly.
99. As a developer, I want to paste a JWT and see its decoded header and payload, so that I can debug authentication.
100. As a developer, I want a JWT's time claims (`exp`, `iat`, `nbf`) shown in my local time, with a clear "expired" indicator, so that I can spot token problems quickly.
101. As a developer, I want it made clear that the JWT signature is not verified, so that I don't mistake decoding for validation.
102. As a developer, I want to generate one or many v4 UUIDs and copy them, so that I can seed data quickly.
103. As a developer, I want to convert between Unix timestamps (seconds and milliseconds, auto-detected) and human-readable local and ISO dates in both directions, so that I can read logs and databases.
104. As a developer, I want a "now" button in the Timestamp tab, so that I can get the current timestamp instantly.
105. As a developer, I want a copy button on every output, so that I can use the results immediately.
106. As a developer, I want everything in Dev Utilities processed locally, so that tokens and data never leave my machine.

### Settings

107. As a developer, I want a Settings App, so that I have one place to configure webOS.
108. As a developer, I want to set my name in Settings, so that the greeting is personal.
109. As a developer, I want to choose or remove my weather city in Settings, so that the Weather Widget shows the right place.
110. As a developer, I want to manage Links, Link Groups and Docked Links in Settings, so that Link management is separate from the Desktop.
111. As a developer, I want to manage Data Sources (URL, token, maximum age) in Settings, so that I can connect my own APIs (v2).
112. As a developer, I want to export all my webOS data to a JSON file, so that I have a backup.
113. As a developer, I want the export to leave out Data Source tokens, so that no secret sits in plain text in my Downloads or backups.
114. As a developer, I want to import an export file after a confirmation, replacing my current data, so that I can restore a backup or move to another machine.
115. As a developer, I want an import of an invalid or newer-version file to be rejected with a clear message and my data left untouched, so that a bad file can't corrupt webOS.
116. As a developer, I want to be reminded to re-enter Data Source tokens after an import, so that my Data Sources start working again.

### Data Sources (v2, tentative)

117. As a developer, I want a Sleep Widget showing last night's sleep at a glance, fed by my own API, so that I see how I slept when I open a tab.
118. As a marathon runner, I want a Training Widget showing my next training session, fed by my own API, so that I know what's planned without opening another app.
119. As a developer, I want each Data Source configured as an HTTPS URL plus an optional bearer token, so that my personal data is protected on my public server.
120. As a developer, I want Data Source Widgets to show cached data immediately and refresh in the background only when it is older than that Data Source's maximum age, so that the Desktop stays instant.
121. As a developer, I want the sleep data refreshed at most once an hour and the training data refreshed on every new tab, so that each Data Source is as fresh as it needs to be.
122. As a developer, I want a failed refresh to keep showing the last cached data, marked as stale, so that one network hiccup doesn't empty my Desktop.
123. As a developer, I want a Data Source Widget that has never loaded successfully to show a clear "not connected" state linking to Settings, so that I know how to fix it.
124. As a developer, I want webOS to have network access only to my own domain and the weather service, so that the extension can't reach anything else.

### Quality and privacy

125. As a developer, I want webOS to work offline-first: everything except the weather works without a network, so that it is reliable on any network.
126. As a developer, I want all data stored locally on this machine, so that nothing personal leaves my browser.
127. As a developer, I want Markdown preview output sanitised, so that pasted content can't run scripts on my new tab.
128. As a developer, I want webOS to keep working after updates that change how data is stored, with my existing data migrated automatically, so that updates never lose my Notes or Todos.

## Implementation Decisions

### Platform

- webOS is a Manifest V3 extension, loaded unpacked in Brave for personal use. It replaces the new tab through the new-tab override.
- Permissions: `storage`, `bookmarks` and `history` (Launcher search), `favicon` (Link favicons), and `clipboardWrite`. `host_permissions` covers Open-Meteo's forecast and geocoding hosts (`api.open-meteo.com`, `geocoding-api.open-meteo.com`), for the Weather Widget; in v2 it also covers the user's own server domain. No other host access is requested.
- Known limitation, accepted: on a fresh tab the browser gives keyboard focus to the address bar, and the page doesn't try to take it. The Launcher opens with ⌘/Ctrl+K or type-to-search only after the page has focus, or with the Menu Bar Launcher button. No redirect workaround is used for focus.
- The name "webOS" is LG's trademark. That's fine for a private unpacked extension, but would need renaming if webOS were ever published.

### Framework and motion (see ADR-0001)

- Angular, latest major version: standalone components, signals, zoneless change detection, the esbuild application builder.
- Extension build adjustments: critical-CSS inlining off (its inline `onload` handler breaks the extension's Content Security Policy) and output hashing off (stable paths for the manifest).
- Spring motion uses the framework-agnostic `animate()` from the Motion library. `@angular/animations` is not used.
- Two small framework-agnostic utilities provide the signature interactions:
  - a FLIP-style shared-element transition for the Window opening out of, and closing back into, its Dock icon
  - a drag behavior for Edit Mode built on Angular CDK drag-drop, which settles onto the snap grid with a spring
- Every animation respects `prefers-reduced-motion` and falls back to short opacity fades.
- Markdown is rendered with an established Markdown library and its output is sanitised before display.

### Visual design

- Apple design principles with webOS's own identity: no Apple fonts, icons or assets, and no copied macOS window controls.
- Dark mode only.
- One fixed wallpaper ("Midnight Deep"): an original, generated near-black with a faint blue light falling from the top centre, and subtle film grain. It is not user-configurable.
- The palette is Midnight Deep: almost black, with only a trace of blue in the light, the glass and a muted blue accent.
- Translucent materials (background blur) for the Menu Bar, Dock, Widgets, Window and Launcher, with a shared set of material tokens so all surfaces stay consistent. Widgets lie flat on the Desktop; the Window, the Launcher, menus and toasts cast a shadow.
- The Clock, Weather and Calendar have no surface: their type sits straight on the wallpaper, so the top band reads as one. Every other Widget has a Title Bar: its name in small capitals above a hairline.
- Weather conditions are shown with original monochrome line icons.
- App icons share one look (a dark navy square) and differ only by their symbol.
- Typography: Inter, bundled with the extension so it works offline and needs no remote font loading, falling back to the system font stack.

### Architecture: the webOS core

- All domain logic lives in a **framework-free TypeScript core**. Angular components are thin views that read the core's signals and send commands to it.
- The core is created with three injected edges:
  - **Storage**: the browser's local extension storage in production, an in-memory implementation in tests.
  - **Clock**: real time in production, a controllable clock in tests.
  - **Fetch**: the network in production, a stub in tests. Used by Weather, and by Data Sources (v2).
- Browser-only lookups for the Launcher (bookmarks and history search) also come in through an injected edge, so that the Launcher's ranking can be tested without a browser.
- The core is split into modules, each exposing commands and read-only state:
  - **Profile**: user name; greeting for the current time.
  - **Links**: Link Groups, Links, Docked Links and their order; URL normalisation.
  - **Todos**: add, edit, complete, uncomplete, delete, reorder; clearing completed Todos.
  - **Notes**: create, edit, delete, list by last edit; the Pinned Note and its fallback.
  - **Desktop**: Widget layout on the grid, sizes, visibility, the moves Edit Mode makes, collision resolution.
  - **Launcher**: query to ranked results; executing a result or action.
  - **Dev Utilities**: pure conversions (JSON, Base64, JWT, UUID, timestamp).
  - **Weather**: the chosen city, city search, the cached report, when to fetch again, what the Widget shows.
  - **Calendar**: months as six weeks starting on Monday with ISO week numbers; describing a day relative to today; stepping by day and by month.
  - **Backup**: export to and import from the versioned JSON document.
  - **Data Sources** (v2): configuration, cache, freshness, refresh, aggregate status.
- UI-only state (which App is open, whether Edit Mode is on, the Launcher's open state and selection) lives in the Angular layer, not the core. The exception is per-App remembered state that must survive tabs, such as the selected Note, which goes in the core's storage.

### Persisted state

- One versioned state document in local extension storage. It contains:
  - profile: name
  - Link Groups (name, order) and Links (title, URL, group, order)
  - Docked Links: an ordered list of Link ids. Being in the list is the docked flag; its order is the dock order, independent of the Link Groups' order
  - Todos (text, order, created time, completed time or none)
  - Notes (Markdown body, created time, last-edited time) and the Pinned Note reference
  - Desktop layout (per Widget: visible, size S/M/L, grid position)
  - weather: the chosen city (name, region, country, coordinates) and the last report fetched for it
  - per-App remembered state
  - Data Sources (v2): ID, kind (sleep or training), URL, maximum age, token, last successful payload, last fetch time, last error
- The document carries a **schema version**. On load, the core migrates older versions forward step by step before use.
- Notes are written with a short debounce while typing. Everything else is written immediately.

### Desktop and Edit Mode

- Widgets in v1: Clock, Links, Todos, Notes, Weather, Calendar. At most one instance of each. v2 adds Sleep and Training.
- The Desktop is a snap grid. Each Widget has sizes S, M and L, defined as grid spans per Widget.
- Dropping a Widget onto occupied cells pushes the other Widgets to the next free position, so Widgets never overlap.
- Edit Mode is entered only from the Desktop's right-click menu ("Edit Desktop"). It is left with Esc or the Menu Bar "Done" button.
- The default layout is the **Stage** layout: a top band of Weather at S (3 × 3 cells), the Clock at M (6 × 3) and Calendar at S (3 × 3), and Links, Todos and Notes at M (4 × 5 each) in a row beneath it. The Clock's L is the full width (12 × 3). The layout shows all v1 Widgets and fills the grid, so in Edit Mode a Widget swaps with one of the same size dropped onto, and other moves need room made first by making a Widget smaller or hiding it.
- The Desktop's grid is centred and at most 1180 px wide.
- Schema version 9 moved every saved layout to the first Stage layout, and schema version 10 moves it once more, to the Stage layout with Weather and Calendar. Hidden Widgets stay hidden.

### Window and Apps

- Apps in v1: Notes, Dev Utilities, Settings. Only one Window exists at a time. Opening another App replaces the open one.
- Item → face mapping:

  | Item | Widget | App |
  |---|---|---|
  | Clock / greeting | yes | — |
  | Links | yes | — (managed in Settings) |
  | Todos | yes | — |
  | Notes | Pinned Note preview | full editor |
  | Dev Utilities | — | yes |
  | Settings | — | yes |
  | Sleep, Training (v2) | yes | maybe later |

- The Window closes with Esc, its close control, a click on the Desktop outside it, or a click on the open App's Dock icon. Choosing the open App in the Launcher keeps it open.

### Rules

- **Greeting**: morning 05:00–11:59, afternoon 12:00–16:59, evening 17:00–21:59, night otherwise. Uses the name if one is set, otherwise just the greeting.
- **Clock**: 12-hour format in the Clock Widget and the Menu Bar.
- **Todo clearing**: a completed Todo is removed once 3 days have passed since its completion time. Unchecking it before then cancels the removal.
- **Note title**: the first non-empty line, with Markdown heading markers stripped. "Untitled" if the Note is empty.
- **Pinned Note fallback**: if no Note is pinned, or the Pinned Note was deleted, the Widget shows the most recently edited Note.
- **Link URL normalisation**: a URL without a scheme gets `http://` for `localhost` and IP addresses, and `https://` otherwise.
- **Link opening**: plain click opens in the current tab. ⌘/Ctrl+click, middle-click or ⌘/Ctrl+Enter in the Launcher opens in a background tab.
- **Weather**: from Open-Meteo, in °C, for the city chosen in Settings; only its coordinates are sent. The last report is stored and shown at once. A new tab fetches it again once it is 30 minutes old (one fetch at a time), with no background polling. A failed fetch keeps the last report; once it is over an hour old the Widget says when it is from. With no report and a failed fetch, the Widget says the weather is unavailable. Changing the city drops the old city's report. WMO weather codes map to nine conditions: clear, partly cloudy, cloudy, fog, drizzle, rain, snow, showers, thunderstorm.
- **Calendar**: a month in local time, always six weeks (Monday to Sunday, starting with the week of the 1st) so every month is the same height, with ISO 8601 week numbers, the neighbouring months' days faded, and today marked. No events. ‹ and › browse months; the month's name shows the year only for other months, and a Today button under the grid, shown only then, returns to the current one. Each tab starts on the current month; the month shown isn't saved. Each day's accessible name describes it relative to today ("Mon, Nov 30, in 18 days": whole calendar days, unaffected by daylight saving). Clicking a day, or Enter, copies it as `YYYY-MM-DD`. Arrow keys move by day and week and Page Up/Down by month (to the same day, or the last day of a shorter month), turning the page when they leave the month.

### Launcher

- Opens with ⌘/Ctrl+K, the Menu Bar button, or any printable key while the page has focus and no text field does.
- Result order by kind: actions that match the query's command word, Apps, Links, Todos and Notes, bookmarks, history, then always "Search Brave for …" last.
- Within a kind, case-insensitive matches rank in this order: whole-word prefix, then word-start, then substring. Ties are broken by recency where it exists (Notes by last edit, history by last visit).
- Actions in v1: "new todo <text>", "new note <text>", "uuid" (copies a v4 UUID and shows a brief confirmation).
- Bookmark and history results are capped to a few each so they never crowd out the user's own items.

### Backup

- Export produces one JSON file containing the full state document. It **leaves out** the cached weather report (the city is kept), and Data Source tokens and cached Data Source payloads. Import drops any weather report in the file.
- Import requires confirmation, validates the document and its schema version (migrating older versions), and replaces the current state as a whole. Files that are invalid or come from a newer version are rejected and the current state is not touched. After an import that contains Data Sources, the user is told to re-enter tokens.

### Data Sources (v2, tentative)

- Two kinds, each with its own dedicated Widget and its own typed adapter: **Sleep** (last night at a glance) and **Training** (next session). There is no generic Data Source contract until a third Data Source exists.
- Each Data Source is an HTTPS URL on the user's own server plus an optional bearer token, sent as an `Authorization` header. Tokens live only in local storage.
- Freshness is stale-while-revalidate, on new-tab open only:
  - show the cached payload immediately
  - if it is older than the Data Source's maximum age, refetch in the background
  - default maximum age: 60 minutes for Sleep, 0 (refetch on every open) for Training
- There is no background service-worker polling.
- A failed or timed-out refresh keeps the cached payload, marks it stale and records the error.
- Menu Bar status dot: hidden when no Data Sources are configured, green when all are fresh, amber when any is stale or failing.

## Testing Decisions

- **What makes a good test**: it uses only the webOS core's public commands and read-only state, the same way the UI does. It never touches a module's internals or private data structures, and never depends on how state is stored. A good test describes a user-visible behavior ("complete a Todo, advance the clock 3 days, and it's gone") and keeps passing through any refactor that preserves that behavior.
- **One test seam: the webOS core.** Tests build a core with an in-memory Storage, a controllable Clock, a stubbed Fetch and a stubbed bookmarks/history lookup. No browser, no Angular TestBed.
- **Tool**: Vitest.
- **What gets tested through the core**:
  - Todos: add, edit, complete, uncomplete, reorder, clearing after 3 days and cancelling it
  - Notes: title derivation, ordering by last edit, Pinned Note and its fallback
  - Links: URL normalisation, Link Groups, Docked Links and their order
  - Desktop: default layout, moving with collision resolution, resizing, hiding and showing, one instance per Widget
  - Profile: greeting by time of day, with and without a name
  - Launcher: ranking across kinds and match quality, the Brave Search fallback, each action's effect
  - Dev Utilities: JSON validation and error position, Base64 with Unicode and URL-safe input, JWT decoding and expired detection, UUID format, timestamp seconds/milliseconds detection and round-trips
  - Weather: city search, the report and its conditions, serving from the stored report, fetching again only after 30 minutes, keeping the last report on failure, changing the city, backup without the report
  - Calendar: weeks from Monday, ISO week numbers across the turn of the year, neighbouring months' days, today, the change of month, browsing months, describing a day (including across a daylight-saving change), stepping by day and month
  - Backup: export/import round-trip, tokens and caches left out, invalid and newer-version files rejected without changes, migration of older versions
  - Data Sources (v2): serving from cache, refetch only past the maximum age, stale on failure, aggregate status
- **Not tested automatically**: Angular components, motion, layout and visuals. These are checked by hand in Brave. There are no end-to-end browser tests in v1.
- **Prior art**: none. The repo is new, and these tests set the pattern.

## Out of Scope

- A multi-window manager (stacking, resizing or minimising Windows).
- Light mode, theme switching, and wallpaper choice or upload.
- Multiple instances of the same Widget.
- Multiple Todo lists, due dates and priorities.
- Note folders, tags and attachments.
- Syncing across devices. Export/import is the only way to move data.
- Publishing to the Chrome Web Store, and the rename that would require.
- End-to-end browser tests and visual regression tests.
- GitHub, Hacker News/RSS and other third-party integrations, apart from the weather.
- Calendar events and calendar accounts.
- Hourly or multi-day forecasts, other units than °C, and detecting the location from the browser.
- A generic Data Source contract or a generic Data Source Widget.
- Background polling of Data Sources.
- Workarounds for address-bar focus on new tabs.
- A Launcher action for entering Edit Mode.

## Further Notes

- Data Sources are tentative. The user hasn't decided whether to build the sleep and training APIs. v1 must not depend on them, but the core's Fetch edge and the Data Source module shape should be ready for them.
- Open question for v2: does the training plan live in Strava or another training platform? If so, the Training Data Source may be an adapter over that platform rather than an API the user builds.
- Build order suggestion: first a throwaway prototype of the wallpaper and the translucent material (to settle blur, tint and contrast, which every surface depends on), then the core and its tests, then the Angular shell (Desktop, Menu Bar, Dock, Window), then the Widgets and Apps, then the Launcher.
- All terms in this spec are defined in the [GLOSSARY](../../GLOSSARY.md). Keep code and future specs consistent with it.
