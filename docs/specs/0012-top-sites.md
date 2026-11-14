# Spec 0012: The Top Sites Widget

Status: built (2026-11-14)
Related: [Spec 0002: More Widgets](0002-more-widgets.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, webOS replaces the browser's new tab, and with it the shortcuts to the sites I visit most. To open GitHub or my mail I now have to type, or find them in the Recent Widget if I happened to visit them last.

## Solution

A **Top Sites Widget** shows the browser's **Top Sites**, the same list its own new tab page uses, as tiles: each site's icon in a rounded square, with its name under it. Clicking a tile opens the site. Like the Clock, it has no surface, and on a fresh Desktop it sits under the Search Widget, so the two read together.

## User Stories

1. As a developer, I want my most visited sites one click away on the new tab, so that I don't have to type them.
2. As a developer, I want the same sites the browser would show me, so that the list keeps itself up to date without my curating it.
3. As a developer, I want the tiles to fit the Widget at every size and screen, never cut in half, so that it always looks tidy.
4. As a developer, I want the tiles to open like ordinary links, so that a middle click opens a site in a new tab.

## Implementation Decisions

- The `BrowserLookup` edge gains `topSites()`, through the extension's new `topSites` permission (`chrome.topSites.get`). An installed copy may ask to approve it when it updates; reloading an unpacked copy grants it.
- The core keeps the sites per tab and never saves them, like the Recent Widget's pages: `topSites.sites()` and `topSites.refresh()`. It keeps the browser's order, leaves out pages that aren't on the web and repeats, names a site without a title by its address, and shows at most 10, as many as the Recent Widget. A failed refresh keeps the sites there were.
- The Widget `top-sites` is S 3 × 2, M 7 × 2 and L 12 × 2. A fresh Desktop shows it at M under the Search Widget (column 7, row 3); an existing Desktop gets it hidden, for Edit Mode to show. No schema change: a layout without it gets it hidden when loaded.
- The Widget asks for the sites when it appears and whenever the tab is shown again. Tiles scale with the Widget's box; each row of tiles is centred, and the list is cut to whole rows, so only tiles that fit show.
- Icons are the browser's cached favicons, as in the Recent Widget, with the first letter of the name where there is none.

## Testing Decisions

- The core tests cover the order and names, leaving out non-web pages and repeats, the limit of 10, following the browser on refresh, keeping the sites when a refresh fails, and having no browser.
- The layout tests include Top Sites: on a fresh Desktop under the Search Widget, and hidden on existing ones.
- The Widget is checked by hand at every size, on 4K and on 1366 × 768.

## Out of Scope

- Removing, pinning or adding sites by hand. The browser keeps the list.
- Bookmarks.
