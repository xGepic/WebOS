import type { BrowserLookup, BrowserPage } from '../core';

/** The most pages to ask the browser for; the core ranks them and shows only a few. */
const MAX_LOOKUP_RESULTS = 25;

/** Pages webOS can open. Bookmarklets (`javascript:`) can't run from the Launcher. */
const openable = (page: BrowserPage) => !/^javascript:/i.test(page.url);

/**
 * The browser's bookmarks and history, through the extension `bookmarks` and
 * `history` permissions, for the Launcher and the Recent Widget. Outside the
 * extension (`ng serve`) there are none.
 */
export function createBrowserLookup(): BrowserLookup {
  const bookmarks = globalThis.chrome?.bookmarks;
  const history = globalThis.chrome?.history;
  return {
    async bookmarks(query) {
      if (!bookmarks) return [];
      const nodes = await bookmarks.search(query);
      return nodes
        // Folders have no URL.
        .flatMap((node) => (node.url ? [{ title: node.title, url: node.url }] : []))
        .filter(openable)
        .slice(0, MAX_LOOKUP_RESULTS);
    },
    async history(query) {
      if (!history) return [];
      // Without a start time the browser searches only the last 24 hours.
      const items = await history.search({ text: query, startTime: 0, maxResults: MAX_LOOKUP_RESULTS });
      return items
        .flatMap((item) => (item.url ? [{ title: item.title ?? '', url: item.url, visitedAt: item.lastVisitTime ?? 0 }] : []))
        .filter(openable);
    },
    async recent(count) {
      if (!history) return [];
      const items = await history.search({ text: '', startTime: 0, maxResults: count });
      return items.flatMap((item) => (item.url ? [{ title: item.title ?? '', url: item.url, visitedAt: item.lastVisitTime ?? 0 }] : []));
    },
  };
}
