# Spec 0003: A Leaner Desktop

Status: built (2026-11-13)
Related: [Spec 0001: webOS v1](0001-webos-v1.md), [Spec 0002: More Widgets](0002-more-widgets.md), [GLOSSARY](../../GLOSSARY.md)
Changes: Spec 0001 and Spec 0002. Where they disagree with this spec, this spec wins.

## Problem Statement

As a developer, I use webOS every day, and parts of it get in my way. I search the web from the new tab, but the only way to do that is a Launcher I have to summon, and its web search goes to Brave Search rather than the search engine I use. The Launcher's other searches, the Links Widget, Docked Links and the GitHub Widget all show things I don't look at. Countdowns and World Clock cities are edited in Settings, far from the Widgets that show them. Notes has both a Widget and a Dock icon. The Clock can't sit in the middle of the Desktop, so the top band always looks off-centre. And the Dev Utilities JWT tab is a tool I don't need, while comparing two texts is one I do.

## Solution

webOS gets smaller and more direct:

- A **Search Widget** under the Clock searches **DuckDuckGo**. It replaces the **Launcher**, which is removed together with its ⌘/Ctrl+K shortcut, type-to-search and the Menu Bar's search button.
- **Links**, **Link Groups**, **Docked Links**, the **Links Widget** and the **GitHub Widget** are removed, with all their settings and saved data.
- **Countdowns** and **World Clock** become Apps that open from their Widgets, like Notes. Settings no longer has sections for them. **Notes** leaves the Dock.
- **Clock M** is 7 columns wide, so the Clock and the Search Widget sit in the exact middle of the 21-column grid.
- Dev Utilities swaps the **JWT** tab for a **Diff** tab.

## User Stories

### Searching

1. As a developer, I want a search field on the Desktop, so that I can search the web without opening anything first.
2. As a developer, I want Enter to search DuckDuckGo in this tab, as the address bar would, so that the results replace the new tab.
3. As a developer, I want ⌘/Ctrl+Enter to open the results in a background tab and clear the field, so that I can queue up several searches.
4. As a developer, I want the search field to be a slim bar, not a tall panel, so that it takes no more room than it needs.

### Apps opened from their Widgets

5. As a developer, I want clicking the Countdown Widget to open a Countdowns App, so that I add, change and delete Countdowns where I see them rather than in Settings.
6. As a developer, I want the Countdowns App to list my Countdowns soonest first with the days to go, so that I see what I am editing.
7. As a developer, I want clicking the World Clock Widget to open a World Clock App, so that I add, reorder and remove cities where I see them.
8. As a developer, I want the World Clock App to show each city's time now, its day, how far ahead or behind it is and its time zone, with night dimmed, so that I see what I am editing.
9. As a developer, I want the Window to spring out of the Widget that opened it and close back into it, so that these Apps feel like the ones in the Dock.
10. As a developer, I want a Widget's list to keep scrolling even though a click on the Widget opens its App, so that a long list stays usable.
11. As a developer, I want Notes only on its Widget, not also in the Dock, so that the Dock has no duplicate.

### Layout

12. As a developer, I want the Clock in the exact middle of the Desktop, with the Search Widget under it, so that the top band looks balanced.
13. As a developer updating from an earlier webOS, I want a Desktop still on the old Stage layout moved to the new one, and a Desktop I arranged myself left as it is, so that I get the new design without losing my own arrangement.

### Dev Utilities

14. As a developer, I want a Diff tab in place of the JWT tab, comparing a Before and an After text line by line, so that I can see what changed between two versions.
15. As a developer, I want the part of a changed line that differs marked, and long unchanged stretches folded, so that the changes stand out.
16. As a developer, I want to be able to ignore differences in whitespace, so that re-indented text doesn't drown out real changes.

### Removed

17. As a developer, I want the Launcher, Links, Docked Links, the Links Widget and the GitHub Widget gone, together with their settings, saved data and browser permissions, so that webOS keeps only what I use and asks only for what it needs.

## Implementation Decisions

### Platform

- Permissions are now `storage`, `favicon`, `clipboardWrite`, `history`, `system.cpu` and `system.memory`. `bookmarks` is gone, as nothing reads bookmarks; `history` stays for the Recent Widget.
- Host permissions are only Open-Meteo's forecast and geocoding APIs. `https://api.github.com/*` is gone.
- The BrowserLookup edge has only `recent(count)`. Its bookmark and history search, used only by the Launcher, is gone.

### Desktop

- Widgets: Clock, Todos, Notes, Weather, Calendar, World Clock, Countdown, Moon, Sun, Recent, System, Search. Still at most one of each. Search is last in the catalog, so it is last among the hidden Widgets Edit Mode offers.
- Sizes (columns × rows) that changed: Clock M is 7 × 2 (it was 6 × 3); Search is 3 × 1 / 7 × 1 / 12 × 1 at S / M / L. The grid is still 21 × 8, so a Widget is centred only when its width is odd, and the Clock and Search share columns 7 to 13 at M.
- The Stage layout: World Clock M at 0,0, Weather S at 3,0, Clock M at 7,0 with Search M at 7,2 under it, Calendar S at 15,0 and Sun M at 18,0; beneath them Todos M at 3,3, Notes M at 6,3, Countdown S at 9,6, System S at 12,6, Moon S at 15,6 and Recent M at 18,3. Free: a one-column gap on either side of the Clock and Search, a 3 × 5 space at 0,3 and a 9 × 3 space at 9,3, so Edit Mode has room to move things.
- The Search Widget has no Title Bar. Its field is a 44 px bar centred in its one-row cell; the rest of the cell is transparent.

### Apps and the Window

- Apps: Notes, Countdowns, World Clock, Dev Utilities, Settings. Each App says whether it is docked. Only Dev Utilities and Settings are; the others open from their Widgets.
- The Window opens out of an App's **origin** and closes back into it: its Dock icon, or the Widget that opens it. A Widget registers itself as its App's origin while it is on the Desktop. Without an origin, the Window fades.
- The Countdown and World Clock Widgets open their Apps with one shared control, `.widget-open` in `controls.css`. It lies under the Widget's list, which sits above it so it can scroll and opens the App on a click itself; the control is what the keyboard reaches. Their empty states open the App too. The Notes Widget keeps its own control over the whole Widget, as its preview doesn't scroll.
- Countdowns and World Clock cities are no longer set in Settings. Settings has Profile, Weather and Backup.
- Countdowns App icon: an hourglass. World Clock App icon: a globe.

### Persisted state

- **Schema 13**: a Desktop whose top band is still schema 12's Stage moves to the centred one (Clock at 7,0, Calendar at 15,0, Sun at 18,0, Moon S at 15,6), keeping what is hidden. Any other layout is left as it is; loading it moves whatever the wider Clock now covers.
- **Schema 14**: the Search Widget is added under the Clock, wherever the Clock is, when the Clock is shown at M; otherwise it starts hidden.
- **Schema 15**: the GitHub token and contribution graph are deleted.
- **Schema 16**: the Link Groups and the Docked Link ids are deleted.
- A saved layout drops entries for Widgets webOS no longer has (Links, GitHub) when it is loaded, as for any unknown Widget.

### Rules

- **Search**: `https://duckduckgo.com/?q=` with the trimmed query, URL-encoded. An empty field does nothing.
- **Diff**: lines are matched with Myers' algorithm, as `git diff` does by default. Each change lists its removed lines, then its added ones. The nth removed line of a change is paired with its nth added line, and the part between what they share at the start and end is marked; lines that share nothing at either end aren't marked. Unchanged runs keep 3 lines beside each change and fold the rest, unless only one line would fold. Ignoring whitespace compares lines trimmed and with runs of spaces collapsed. Windows line endings never count as a difference. Texts that differ in more than 2,000 lines get a message instead of a diff. Nothing is shown until both texts have something in them.
- **Dev Utilities tabs**: JSON, Base64, Diff, UUID, Timestamp. A remembered tab that no longer exists, such as JWT, falls back to JSON.

## Testing Decisions

- As in Specs 0001 and 0002, tests go only through the webOS core's public API, with the in-memory Storage, the controllable Clock and the stubs.
- What is tested: the Stage layout, the centred Clock and Search and the free space; schemas 13 to 16, including a Desktop on the old Stage and one the user arranged; Edit Mode swaps and refused moves on the new Stage; the Diff (identical texts, line numbers, marking, folding, whitespace, line endings, the 2,000-line limit); the web search URL; the Dev Utilities tab fallback.
- Widgets and Apps are checked by hand.

## Out of Scope

- Search suggestions, or choosing the search engine in Settings.
- Typing in the Search Widget straight from a fresh tab: the browser gives the address bar focus, so the field has to be clicked first, as the Launcher already had to be.
- A copyable patch from the Diff tab.

## Further Notes

- With the Launcher gone, Notes, Countdowns and World Clock open only from their Widgets. A hidden Widget leaves its App unreachable until the Widget is shown again; the data is kept.
- An open tab fetches the weather only when it opens, not again while it stays open.
- A backup from this version can't be imported into an older build, as its schema version is newer.
