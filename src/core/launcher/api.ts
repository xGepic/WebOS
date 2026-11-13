import { uuids } from '../dev-utilities/dev-utilities';
import type { BrowserLookup } from '../edges';
import type { OrganizerApi } from '../organizer/api';
import type { Store } from '../store';
import * as launcher from './launcher';

export interface LauncherApi {
  readonly launcher: {
    /**
     * What the Launcher finds for `query`, best first: Apps, Links, Todos and
     * Notes, a few bookmarks, a few history entries, and always a Brave search
     * for the query last.
     */
    search(query: string): Promise<readonly launcher.LauncherResult[]>;
    /** Runs a quick action the Launcher found, and says what it did. A suggestion still to be finished does nothing. */
    run(action: launcher.ActionResult): Promise<launcher.ActionOutcome | undefined>;
  };
}

/** The Launcher: it searches the user's own things and the browser's, and runs quick actions with the organizer's commands. */
export function createLauncher(
  store: Store,
  organizer: Pick<OrganizerApi, 'todos' | 'notes'>,
  browser: BrowserLookup | undefined,
): LauncherApi {
  return {
    launcher: {
      async search(query) {
        const typed = query.trim();
        // The browser's pages are a bonus: if it can't look them up, the Launcher still finds everything else.
        const lookUp = <T>(find: (browser: BrowserLookup) => Promise<T[]>) =>
          typed && browser ? find(browser).catch(() => []) : Promise.resolve([]);
        const [bookmarks, history] = await Promise.all([
          lookUp((browser) => browser.bookmarks(typed)),
          lookUp((browser) => browser.history(typed)),
        ]);
        return launcher.search(query, {
          linkGroups: store.state().linkGroups,
          todos: organizer.todos.open(),
          notes: organizer.notes.list(),
          bookmarks,
          history,
        });
      },
      async run(action) {
        if (action.queryToFill !== undefined) return undefined;
        switch (action.action) {
          case 'new-todo': {
            const todoId = await organizer.todos.add(action.text);
            return todoId ? { kind: 'todo-added', todoId } : undefined;
          }
          case 'new-note':
            return { kind: 'note-created', noteId: await organizer.notes.create(action.text) };
          case 'uuid':
            return { kind: 'copy', text: uuids(1)[0] };
        }
      },
    },
  };
}
