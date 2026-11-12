import { apps, type AppId } from './apps';
import type { LinkGroup } from './links';

/** An App the Launcher found; choosing it opens the App in the Window. */
export interface AppResult {
  kind: 'app';
  id: string;
  title: string;
  app: AppId;
}

/** A Link the Launcher found; choosing it opens the Link. */
export interface LinkResult {
  kind: 'link';
  id: string;
  title: string;
  url: string;
}

/** The last Launcher result, always there: a Brave search for what was typed. */
export interface WebResult {
  kind: 'web';
  id: 'web';
  title: string;
  url: string;
}

export type LauncherResult = AppResult | LinkResult | WebResult;

/** How well a name matches the query; lower is better. */
const Match = {
  /** The name starts with the query. */
  NameStart: 0,
  /** A later word in the name starts with the query. */
  WordStart: 1,
  /** The query is somewhere inside the name. */
  Anywhere: 2,
} as const;
type Match = (typeof Match)[keyof typeof Match];

/** A letter or digit: anything else separates words. */
const wordCharacter = /[\p{L}\p{N}]/u;

/** How well `name` matches `needle` (already lower-cased), or undefined if it doesn't contain it. */
function matchOf(name: string, needle: string): Match | undefined {
  const haystack = name.toLowerCase();
  let best: Match | undefined;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
    if (at === 0) return Match.NameStart;
    best = wordCharacter.test(haystack[at - 1]) ? (best ?? Match.Anywhere) : Match.WordStart;
  }
  return best;
}

/** The candidates whose name matches `needle`, best match first, keeping their order between equal matches. */
function ranked<T>(candidates: readonly T[], nameOf: (candidate: T) => string, needle: string): T[] {
  return candidates
    .map((candidate) => ({ candidate, match: matchOf(nameOf(candidate), needle) }))
    .filter((scored): scored is { candidate: T; match: Match } => scored.match !== undefined)
    .sort((a, b) => a.match - b.match)
    .map(({ candidate }) => candidate);
}

/**
 * The Launcher's results for `query`, best first: Apps, then Links, each
 * ranked by how well their name matches, ignoring case. A Brave search for the
 * query always comes last. An empty query finds nothing.
 */
export function search(query: string, linkGroups: readonly LinkGroup[]): LauncherResult[] {
  const typed = query.trim();
  if (!typed) return [];
  const needle = typed.toLowerCase();
  const appResults = ranked(apps, (app) => app.name, needle).map(
    (app): AppResult => ({ kind: 'app', id: `app:${app.id}`, title: app.name, app: app.id }),
  );
  const linkResults = ranked(
    linkGroups.flatMap((group) => group.links),
    (link) => link.title,
    needle,
  ).map((link): LinkResult => ({ kind: 'link', id: `link:${link.id}`, title: link.title, url: link.url }));
  return [...appResults, ...linkResults, webSearch(typed)];
}

function webSearch(query: string): WebResult {
  return {
    kind: 'web',
    id: 'web',
    title: `Search Brave for "${query}"`,
    url: `https://search.brave.com/search?q=${encodeURIComponent(query)}`,
  };
}
