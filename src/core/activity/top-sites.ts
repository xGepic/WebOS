import type { TopSitePage } from '../edges';

/** A site from the browser's most visited, as the Top Sites Widget shows it. */
export interface TopSite {
  /** The page's title, or its site when it has none. */
  title: string;
  url: string;
  /** The site, e.g. "github.com", for the tooltip. */
  site: string;
}

/** The most sites the Top Sites Widget shows, as many as the Recent Widget lists; it shows fewer when its box fits fewer. */
export const TOP_SITES = 10;

/** Pages on the web: settings and extension pages aren't sites to open from here. */
const onTheWeb = (page: TopSitePage) => /^https?:\/\//i.test(page.url);

function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** The most visited sites, in the browser's order, each once, at most `TOP_SITES`. */
export function topSites(pages: readonly TopSitePage[]): TopSite[] {
  const seen = new Set<string>();
  return pages
    .filter(onTheWeb)
    .filter((page) => !seen.has(page.url) && !!seen.add(page.url))
    .slice(0, TOP_SITES)
    .map((page) => {
      const site = siteOf(page.url);
      return { title: page.title.trim() || site, url: page.url, site };
    });
}
