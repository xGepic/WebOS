import type { BrowserLookup } from '../core';

/**
 * The browser's history, through the extension `history` permission, for the
 * Recent Widget. Outside the extension (`ng serve`) there is none.
 */
export function createBrowserLookup(): BrowserLookup {
  const history = globalThis.chrome?.history;
  return {
    async recent(count) {
      if (!history) return [];
      const items = await history.search({ text: '', startTime: 0, maxResults: count });
      return items.flatMap((item) => (item.url ? [{ title: item.title ?? '', url: item.url, visitedAt: item.lastVisitTime ?? 0 }] : []));
    },
  };
}
