import type { VisitedPage } from '../edges';
import { formatWhen } from '../format';

/** A page from the browser's history, as the Recent Widget lists it. */
export interface RecentPage {
  title: string;
  url: string;
  /** The site, e.g. "github.com", for a page without a title and for the line under it. */
  site: string;
  /** When it was last visited: "Just now", "12 min ago", "3 h ago", then "Yesterday", "Nov 10". */
  when: string;
}

/** The most pages the Recent Widget lists, and so the most it asks the browser for (with some to spare for repeats). */
export const RECENT_PAGES = 12;
const MINUTE = 60_000;

/** Pages on the web: the new tab itself, settings and extension pages aren't worth going back to. */
const onTheWeb = (page: VisitedPage) => /^https?:\/\//i.test(page.url);

function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function when(visitedAt: number, now: Date): string {
  const minutes = Math.floor((now.getTime() - visitedAt) / MINUTE);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const visited = new Date(visitedAt);
  if (visited.toDateString() === now.toDateString()) return `${Math.floor(minutes / 60)} h ago`;
  return formatWhen(visited, now);
}

/** The pages last visited, latest first, each once, at most `RECENT_PAGES`. */
export function recentPages(pages: readonly VisitedPage[], now: Date): RecentPage[] {
  const seen = new Set<string>();
  return [...pages]
    .filter(onTheWeb)
    .sort((a, b) => b.visitedAt - a.visitedAt)
    .filter((page) => !seen.has(page.url) && !!seen.add(page.url))
    .slice(0, RECENT_PAGES)
    .map((page) => {
      const site = siteOf(page.url);
      return { title: page.title.trim() || site, url: page.url, site, when: when(page.visitedAt, now) };
    });
}
