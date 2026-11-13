import { apps, type AppId } from '../desktop/apps';
import type { BrowserPage, VisitedPage } from '../edges';
import type { LinkGroup } from '../organizer/links';
import type { ListedNote } from '../organizer/notes';
import type { Todo } from '../organizer/todos';

/** A quick action the Launcher can run, such as adding a Todo. */
export interface ActionResult {
  kind: 'action';
  id: string;
  title: string;
  action: ActionId;
  /** What the action works with: the text after its command, as typed. */
  text: string;
  /**
   * Set when the command still needs its text: the query to fill in, for the
   * user to finish typing. Such an action doesn't run.
   */
  queryToFill?: string;
}

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

/** An open Todo the Launcher found; choosing it shows the Todos Widget with the Todo highlighted. */
export interface TodoResult {
  kind: 'todo';
  id: string;
  title: string;
  todoId: string;
}

/** A Note the Launcher found; choosing it opens the Note in the Notes App. */
export interface NoteResult {
  kind: 'note';
  id: string;
  title: string;
  noteId: string;
  /** When it was last edited, e.g. "9:05 AM" or "Yesterday". */
  detail: string;
}

/** A page from the browser's bookmarks or history; choosing it opens it, as a Link does. */
export interface PageResult {
  kind: 'bookmark' | 'history';
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

export type LauncherResult =
  | ActionResult
  | AppResult | LinkResult | TodoResult | NoteResult | PageResult | WebResult;

/** What running an action did, for the Launcher to follow up on. */
export type ActionOutcome =
  | { kind: 'todo-added'; todoId: string }
  | { kind: 'note-created'; noteId: string }
  /** Text for the Launcher to copy to the clipboard. */
  | { kind: 'copy'; text: string };

/** The quick actions, in the order the Launcher lists them. */
const ACTIONS = [
  {
    id: 'new-todo',
    command: 'new todo',
    /** A Todo needs text. */
    text: 'required',
    title: (text: string) => `Add Todo "${text}"`,
  },
  {
    id: 'new-note',
    command: 'new note',
    text: 'optional',
    title: (text: string) => (text ? `New Note "${text}"` : 'New Note'),
  },
  {
    id: 'uuid',
    command: 'uuid',
    text: 'none',
    title: () => 'Copy a new UUID',
  },
] as const satisfies readonly {
  id: string;
  /** What the query starts with to run it, ignoring case and runs of spaces. */
  command: string;
  /** Whether text after the command is needed, allowed, or makes it not this action. */
  text: 'required' | 'optional' | 'none';
  title: (text: string) => string;
}[];

export type ActionId = (typeof ACTIONS)[number]['id'];

/**
 * The actions `typed` asks for: those whose command it starts with, followed by
 * any text to act on. A command still missing its text is offered to finish.
 */
function actionResults(typed: string): ActionResult[] {
  return ACTIONS.flatMap((action): ActionResult[] => {
    const id = `action:${action.id}`;
    const words = action.command.split(' ');
    const match = new RegExp(String.raw`^${words.join(String.raw`\s+`)}(?:\s+(.*))?$`, 'is').exec(typed);
    if (!match) return [];
    const text = match[1]?.trim() ?? '';
    // Text after a command that takes none makes it a search, not this action.
    if (text && action.text === 'none') return [];
    if (!text && action.text === 'required') {
      const queryToFill = `${action.command} `;
      return [{ kind: 'action', id, title: `${action.command} …`, action: action.id, text, queryToFill }];
    }
    return [{ kind: 'action', id, title: action.title(text), action: action.id, text }];
  });
}

/** How many bookmarks, and how many history entries, the Launcher shows at most. */
const MAX_PAGES = 3;

/** What the Launcher searches, from the state document. */
export interface Searchable {
  linkGroups: readonly LinkGroup[];
  /** The open Todos, in display order. */
  todos: readonly Todo[];
  /** Every Note, most recently edited first. */
  notes: readonly ListedNote[];
  /** Bookmarked pages the browser found for the query. */
  bookmarks: readonly BrowserPage[];
  /** Visited pages the browser found for the query. */
  history: readonly VisitedPage[];
}

/** How well a result matches the query; lower is better. */
const Match = {
  /** Its title starts with the query. */
  TitleStart: 0,
  /** A later word in its title starts with the query. */
  WordStart: 1,
  /** The query is somewhere inside its title. */
  Anywhere: 2,
  /** The query is only in something besides the title, such as a Note's text. */
  Elsewhere: 3,
} as const;
type Match = (typeof Match)[keyof typeof Match];

/** A letter or digit: anything else separates words. */
const wordCharacter = /[\p{L}\p{N}]/u;

/** How well `title` matches `needle` (already lower-cased), or undefined if it doesn't contain it. */
function matchOf(title: string, needle: string): Match | undefined {
  const haystack = title.toLowerCase();
  let best: Match | undefined;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
    if (at === 0) return Match.TitleStart;
    best = wordCharacter.test(haystack[at - 1]) ? (best ?? Match.Anywhere) : Match.WordStart;
  }
  return best;
}

/** A result the Launcher might show, with any text besides its title that it can be found by. */
interface Candidate<R extends LauncherResult> {
  result: R;
  alsoIn?: string;
}

/** The candidates that match `needle`, best match first, keeping their order between equal matches. */
function ranked<R extends LauncherResult>(candidates: readonly Candidate<R>[], needle: string): R[] {
  return candidates
    .map(({ result, alsoIn }) => ({
      result,
      match: matchOf(result.title, needle) ?? (alsoIn?.toLowerCase().includes(needle) ? Match.Elsewhere : undefined),
    }))
    .filter((scored): scored is { result: R; match: Match } => scored.match !== undefined)
    .sort((a, b) => a.match - b.match)
    .map(({ result }) => result);
}

/**
 * The Launcher's results for `query`, best first, by kind: Apps, then Links,
 * then Todos and Notes, then a few bookmarks, then a few history entries.
 * Within a kind, results rank by how well their title
 * matches, ignoring case. A Brave search for the query always comes last. An
 * empty query finds nothing.
 */
export function search(query: string, { linkGroups, todos, notes, bookmarks, history }: Searchable): LauncherResult[] {
  const typed = query.trim();
  if (!typed) return [];
  const needle = typed.toLowerCase();
  const appResults = ranked(
    apps.map((app) => ({ result: { kind: 'app', id: `app:${app.id}`, title: app.name, app: app.id } })),
    needle,
  );
  const linkResults = ranked(
    linkGroups
      .flatMap((group) => group.links)
      .map((link) => ({ result: { kind: 'link', id: `link:${link.id}`, title: link.title, url: link.url } })),
    needle,
  );
  // One kind: equal matches keep Todos first, in display order, then Notes, most recently edited first.
  const todoAndNoteResults = ranked<TodoResult | NoteResult>(
    [
      ...todos.map((todo) => ({ result: { kind: 'todo', id: `todo:${todo.id}`, title: todo.text, todoId: todo.id } as const })),
      ...notes.map((note) => ({
        result: { kind: 'note', id: `note:${note.id}`, title: note.title, noteId: note.id, detail: note.edited } as const,
        alsoIn: note.body,
      })),
    ],
    needle,
  );
  // A page already shown, as a Link or a bookmark, isn't shown again.
  const shown = new Set(linkResults.map((result) => pageKey(result.url)));
  const unshown = (result: PageResult) => !shown.has(pageKey(result.url));
  const bookmarkResults = ranked(pageCandidates('bookmark', bookmarks), needle).filter(unshown).slice(0, MAX_PAGES);
  bookmarkResults.forEach((result) => shown.add(pageKey(result.url)));
  // Equal matches: the most recently visited first.
  const recentFirst = [...history].sort((a, b) => b.visitedAt - a.visitedAt);
  const historyResults = ranked(pageCandidates('history', recentFirst), needle).filter(unshown).slice(0, MAX_PAGES);
  return [...actionResults(typed), ...appResults, ...linkResults, ...todoAndNoteResults, ...bookmarkResults, ...historyResults, webSearch(typed)];
}

/** A URL in one spelling per page, so `github.com` saved as a Link matches `https://github.com/` from history. */
function pageKey(url: string): string {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}

/** Pages as results. The browser found them by title or URL, so a page whose title doesn't match ranks below those that do. */
function pageCandidates(kind: PageResult['kind'], pages: readonly BrowserPage[]): Candidate<PageResult>[] {
  return pages.map((page) => ({
    result: { kind, id: `${kind}:${page.url}`, title: page.title.trim() || page.url, url: page.url },
    alsoIn: page.url,
  }));
}

function webSearch(query: string): WebResult {
  return {
    kind: 'web',
    id: 'web',
    title: `Search Brave for "${query}"`,
    url: `https://search.brave.com/search?q=${encodeURIComponent(query)}`,
  };
}
