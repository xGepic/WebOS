# Spec 0002: More Widgets

Status: built
Related: [Spec 0001: webOS v1](0001-webos-v1.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, I glance at the new tab dozens of times a day, but the Desktop only answers a few questions: the time, the weather, the month, my Links, Todos and a Note. Other things I check elsewhere would fit just as well: what time it is for colleagues abroad, how many days until a race or a release, the moon and the daylight, the page I just closed, whether my machine is busy, and my GitHub contributions. The Desktop's grid is already full, and on a wide screen the space to its left and right sits empty.

## Solution

webOS gets seven new Widgets: **World Clock**, **Countdown**, **Moon**, **Sun**, **Recent**, **System** and **GitHub**. The Desktop's grid now spans the screen's full width in 21 columns instead of a centred 12, so every Widget fits at once. Everything except the GitHub graph (and the city search that Settings already uses) works offline.

## User Stories

### Layout

1. As a developer, I want the Desktop to use my screen's full width, so that no space is wasted on a wide screen.
2. As a developer, I want every Widget visible at once in the Stage layout, with a little room left over for Edit Mode, so that I never have to hide one Widget to see another.
3. As a developer updating from an earlier webOS, I want my Desktop moved to the new Stage layout once, with Widgets I hid kept hidden and the new Widgets shown, so that I get the new design without losing anything.

### World Clock

3. As a developer, I want a World Clock Widget showing the time in up to six cities, so that I know whether colleagues abroad are awake.
4. As a developer, I want each city to say whether it is already tomorrow or still yesterday there, and how many hours ahead or behind it is, so that I can plan calls.
5. As a developer, I want cities where it is night dimmed, so that I can see at a glance who is offline.
6. As a developer, I want to add cities by searching in Settings (the same search as the weather city), reorder them and remove them, so that the list is mine.

### Countdown

7. As a developer, I want a Countdown Widget showing the days to go until days I choose, soonest first and the soonest one large, so that a race or a release is always in view.
8. As a developer, I want to add, change and delete Countdowns in Settings, each with a title and a day, so that I can keep them current.
9. As a developer, I want a Countdown to say "Today" on its day and to be cleared once its day has passed, so that the list never fills up with the past.

### Moon and Sun

10. As a developer, I want a Moon Widget showing tonight's phase as a drawn disc, its name, how much of it is lit, and the dates of the next full and new moons, so that I know what the night sky holds.
11. As a developer in the southern hemisphere, I want the Moon drawn the way I see it, so that the lit side is on the correct side.
12. As a developer, I want a Sun Widget showing today's sunrise and sunset for my weather city, the length of the day, how it compares with yesterday, and the sun on its arc, so that I can feel the seasons turning.
13. As a developer whose weather city has polar day or polar night, I want the Sun Widget to say so, so that it never shows nonsense times.

### Recent

14. As a developer, I want a Recent Widget listing the pages I visited last, with their site and how long ago, so that I can get back to a page I closed by mistake.
15. As a developer, I want the Recent Widget to leave out the new tab, browser settings and extension pages, and list each page once, so that the list is worth reading.

### System

16. As a developer, I want a System Widget showing how busy the processors are, with a sparkline of the last minute, and how much memory is in use, so that I can tell at a glance whether a build is still hammering my machine.
17. As a developer, I want the System Widget to take readings only while it is on the Desktop and the tab is shown, so that it costs nothing otherwise.

### GitHub

18. As a developer, I want a GitHub Widget showing my contribution graph, my contributions in the last year, and my current and longest streaks, so that I can keep up a habit.
19. As a developer, I want to set a personal access token in Settings, which is never shown again, kept only on this machine and left out of backups, so that my secret stays safe.
20. As a developer, I want the graph shown at once from the last fetch and fetched again once it is an hour old, so that a new tab never waits for GitHub.
21. As a developer, I want the Widget to say when GitHub refused my token or couldn't be reached, while still showing the last graph, so that I know what to fix.
22. As a developer, I want larger sizes of the GitHub Widget to show more weeks, up to the whole year at full width, so that I can choose how much space it takes.

## Implementation Decisions

### Platform

- New permissions: `system.cpu` and `system.memory` (System Widget). New host permission: `https://api.github.com/*` (GitHub Widget). The Recent Widget uses the `history` permission the Launcher already has.
- The Fetch edge can now send a POST with headers and a JSON body, and rejects with a `FetchError` carrying the HTTP status when the server answers without success.
- A new optional **SystemMonitor** edge reads cumulative processor time and memory. Without it (`ng serve`), the System Widget says the readings are unavailable.
- The BrowserLookup edge gains `recent(count)`: the pages visited last.

### Desktop

- The grid is 21 columns by 8 rows, spanning the screen's width (centred only beyond 2560 px), with gaps from 12 to 20 px depending on the width. On a 1920 px screen a column is about as wide as the old 12-column grid's.
- Widgets: Clock, Links, Todos, Notes, Weather, Calendar, World Clock, Countdown, Moon, Sun, Recent, System, GitHub. Still at most one of each.
- Links, Todos and Notes are 3 × 5 at M (they were 4 × 5). The Clock's L is 12 × 3, no longer the full width.
- New sizes (columns × rows, S / M / L): World Clock 3×2 / 3×3 / 6×2; Countdown 3×2 / 3×3 / 6×3; Moon 3×2 / 3×3 / 4×4; Sun 3×2 / 3×3 / 6×3; Recent 3×3 / 3×5 / 6×5; System 3×2 / 3×3 / 6×3; GitHub 6×2 / 9×3 / 12×3.
- The Stage layout, every Widget visible: a top band of World Clock M at 0,0, Weather S at 3,0, Clock M at 6,0, Calendar S at 12,0, Sun M at 15,0 and Moon M at 18,0; beneath it Links M at 0,3, Todos M at 3,3, Notes M at 6,3, GitHub M at 9,3 with Countdown S at 9,6 and System S at 12,6 under it, and Recent M at 18,3. One 3 × 2 slot (15,6) is left free for Edit Mode to move into.
- Schema version 11 (the first build with these Widgets, on a 12-column grid) added empty Countdowns, World Clock cities and GitHub settings, and hid most new Widgets for lack of room. Schema version 12 moves every saved layout once to the wide Stage layout: of the six v1 Widgets, hidden ones stay hidden; the new Widgets are shown.
- Every new Widget has a surface and a Title Bar.

### Persisted state (schema 11)

- Countdowns: id, title, day (`YYYY-MM-DD`, local).
- World Clock cities: id, name, country, IANA time zone, in the user's order.
- GitHub: the token (empty when not set) and the last contribution graph fetched with it (a cache).
- The weather city gains an optional IANA time zone, which new city searches fill in from the geocoder. Cities chosen before this version have none until chosen again.
- Recent pages and System readings are per tab and never saved.

### Rules

- **World Clock**: at most six cities; a city needs a time zone the browser knows and is added once. Each shows its 12-hour time, "Today", "Tomorrow" or "Yesterday" compared with the local date, and the difference from local time ("9 h ahead", "4 h 30 min behind", "Same time"), following each zone's daylight saving. Night is 6 PM to 6 AM there. At the small size each city takes one line, with the day only when it isn't today.
- **Countdown**: a title is required and trimmed; the day must be a real date. Days to go are whole calendar days, unaffected by daylight saving. The Widget shows today's and later Countdowns, soonest first (then by title); the label has the year only when it isn't this year's. Countdowns before today are cleared when the Desktop loads.
- **Moon**: phase times follow Meeus, *Astronomical Algorithms*, chapter 49, without the planetary terms (within a few minutes). As in almanacs, the local day a principal phase falls on (new, first quarter, full, last quarter) is named after it; the days in between are named after the phase in between. How much is lit comes from the position within the quarter, so it is exactly half at the quarters. Seen from the hemisphere of the weather city; north without one.
- **Sun**: computed locally with the sunrise equation (NOAA's simplified solar position, refraction −0.833°), within about a minute away from the poles. Times are truncated to the minute and shown in the city's time zone when it is known, local time otherwise. The day's change is compared with yesterday's length. "Next" is "Sunrise in …" before sunrise, "Sunset in …" during the day, and "Sunrise tomorrow at …" after sunset. Polar day and polar night are named as such.
- **Recent**: up to 12 pages, latest first, only `http` and `https`, each URL once. A page without a title shows its site. When: "Just now", "N min ago", "N h ago" today, then "Yesterday" or the date. The Widget asks the browser when it appears and whenever the tab is shown again; a failed lookup keeps the last list.
- **System**: a reading every 2 seconds while the Widget is on the Desktop and the tab is visible. Processor use is the non-idle share of processor time between two readings, summed over all cores; the sparkline keeps the last 30. Memory use is capacity minus available. A failed reading keeps the last ones shown.
- **GitHub**: GraphQL `viewer.contributionsCollection.contributionCalendar` with `Authorization: bearer <token>`. The graph is stored and fetched again on a new tab once it is an hour old (one fetch at a time), and at once when the token changes. 401 or 403 means the token was refused; any other failure, or GraphQL errors, means GitHub is unavailable. The last graph stays; once it is over two hours old the Widget says when it is from. The current streak counts days with a contribution up to today; today breaks it only once it is over. Weeks run Sunday to Saturday as on GitHub; S shows the last 26 weeks, M 39 and L 53.
- **Backup**: export leaves out the GitHub token and graph. Import keeps this machine's token and fetches its graph again.

## Testing Decisions

- As in spec 0001, tests go only through the webOS core's public API, with the in-memory Storage, the controllable Clock, a stubbed Fetch (which now also records how each request was sent), a stubbed BrowserLookup and a new stubbed SystemMonitor.
- Tests run in the `Europe/Vienna` time zone, set in `vitest.config.mts`, because the World Clock and Sun compare local time with other zones.
- What is tested: the Stage layout and the schema 11 and 12 migrations; World Clock times, days, differences across daylight saving, limits, ordering and the city search's time zone; Countdown days, "Today", clearing, validation, editing and daylight saving; Moon phase times against published values, phase naming in local time, illumination, the next full and new moons, the hemisphere; Sun times against published tables, the day's change, "next", time zones, polar day and night; Recent filtering, repeats, the limit, "when" and failures; System readings, the sparkline's length and failures; GitHub requests, the graph in weeks, streaks, caching, refused tokens, failures, GraphQL errors and backups.
- Widgets and Settings are checked by hand; headless screenshots of the built app at 1920 and 1440 px wide were used to check the layouts. At 1440 px the 21 columns are narrow (about 50 px), so text in small Widgets is tight.

## Out of Scope

- More than one Countdown Widget or World Clock Widget (still one instance of each Widget).
- Moonrise and moonset, and twilight times.
- Per-process CPU or memory, GPU, disk and network use.
- GitHub pull requests, notifications and anything else beyond the contribution graph.
- Choosing which time zone the Sun uses separately from the weather city.

## Further Notes

- A weather city chosen before this version has no time zone, so the Sun shows its times in local time until the city is chosen again in Settings.
- The production bundle is now 586 kB, further over Angular's 500 kB warning budget.
