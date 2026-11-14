import type { BrowserLookup } from '../core';

/**
 * The browser's history, through the extension `history` and `topSites`
 * permissions, for the Recent and Top Sites Widgets. Outside the extension
 * (`ng serve`) there is none.
 */
export function createBrowserLookup(): BrowserLookup {
  const history = globalThis.chrome?.history;
  const topSites = globalThis.chrome?.topSites;
  return {
    async topSites() {
      if (!topSites) return [];
      return (await topSites.get()).map((site) => ({ title: site.title ?? '', url: site.url }));
    },
    async recent(count) {
      if (!history) return [];
      const items = await history.search({ text: '', startTime: 0, maxResults: count });
      return items.flatMap((item) => (item.url ? [{ title: item.title ?? '', url: item.url, visitedAt: item.lastVisitTime ?? 0 }] : []));
    },
  };
}
