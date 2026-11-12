# Tickets: More Widgets

Source: [Spec 0002: More Widgets](../specs/0002-more-widgets.md)
Vocabulary: [GLOSSARY](../../GLOSSARY.md)

Each ticket is a vertical slice: core logic, tests through the webOS core seam, and UI. They build on the v1 tickets, all done. 01 comes first; the others can run in any order after it.

## Dependency overview

```
01 ─┬─ 02
    ├─ 03
    ├─ 04
    ├─ 05
    ├─ 06
    ├─ 07
    └─ 08
```

---

# 01: A wide Desktop with room for every Widget, schemas 11 and 12

**What to build:** The Widget catalog gains the seven new Widgets with their sizes. The grid spans the screen in 21 columns instead of a centred 12, and the Stage layout shows every Widget at once, leaving one 3 × 2 slot free. Schema 12 moves every Desktop there once.

**Blocked by:** None

**Status:** done

- [x] Catalog entries and sizes for World Clock, Countdown, Moon, Sun, Recent, System and GitHub.
- [x] Links, Todos and Notes are 3 × 5 at M.
- [x] First pass (schema 11): a fourth column on the 12-column grid with the World Clock and a Countdown, the other new Widgets hidden. The user found there was no room to show them while the screen's sides stood empty.
- [x] The grid is 21 × 8 and spans the screen's width (up to 2560 px), with narrower gaps on smaller screens.
- [x] Schema 12 migration: the wide Stage layout once; v1 Widgets the user hid stay hidden, the new Widgets are shown.
- [x] Edit Mode, layout, migration and backup tests updated; v10 and v11 migration tests.
- [x] Tests run in `Europe/Vienna`.
- [x] Checked in headless screenshots at 1920 and 1440 px.

# 02: World Clock

**Blocked by:** 01 · **Status:** done

- [x] The city search keeps each city's IANA time zone.
- [x] Up to six cities, each once, added, reordered and removed in Settings › World Clock.
- [x] The Widget shows each city's time, day and difference, dims night, and fits four cities on one line each at S.
- [x] Core tests, including daylight saving and the day boundary.

# 03: Countdown

**Blocked by:** 01 · **Status:** done

- [x] Add, edit and delete in Settings › Countdowns, with a title and a day.
- [x] The Widget shows days to go, soonest first and large, "Today" on the day.
- [x] Countdowns before today are cleared when the Desktop loads.
- [x] Core tests, including daylight saving and validation.

# 04: Moon

**Blocked by:** 01 · **Status:** done

- [x] Phase times after Meeus, tested against published new, full and quarter moons.
- [x] Phase names by local day, illumination, next full and new moons, hemisphere from the weather city.
- [x] The Widget draws the lit disc; stacked at M and L.

# 05: Sun

**Blocked by:** 01 · **Status:** done

- [x] Sunrise, sunset, day length and change from yesterday, computed locally for the weather city, in its time zone when known.
- [x] "Next" line and the arc with the sun's position; polar day and night.
- [x] Core tests against published times for Vienna and Tokyo.

# 06: Recent

**Blocked by:** 01 · **Status:** done

- [x] BrowserLookup `recent(count)` over the `history` permission.
- [x] Up to 12 web pages, each once, latest first, with site and "when".
- [x] Refreshed when the Widget appears and when the tab is shown again.

# 07: System

**Blocked by:** 01 · **Status:** done

- [x] SystemMonitor edge over `system.cpu` and `system.memory`; permissions added.
- [x] CPU use between readings with a 30-reading sparkline, memory in use.
- [x] Readings every 2 s only while the Widget is shown and the tab is visible.

# 08: GitHub

**Blocked by:** 01 · **Status:** done

- [x] Fetch edge sends POSTs with headers and a JSON body, and rejects with a `FetchError` carrying the status; host permission for `api.github.com`.
- [x] Settings › GitHub sets or removes the token; it is never shown again.
- [x] Contribution graph cached and fetched again once an hour old; refused token and unavailable states.
- [x] Weeks from Sunday, streaks, more weeks at larger sizes.
- [x] Backups leave out the token and the graph; import keeps this machine's token.
