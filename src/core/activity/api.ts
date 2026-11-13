import { FetchError, type BrowserLookup, type Fetch, type SystemMonitor, type VisitedPage } from '../edges';
import { createRefresher } from '../refresher';
import type { Store } from '../store';
import * as github from './github';
import * as recent from './recent';
import * as system from './system';

export interface ActivityApi {
  /** The pages visited last, for the Recent Widget. Kept per tab and never saved. */
  readonly recent: {
    /** The pages from the last `refresh`, latest first; none before one. */
    pages(): readonly recent.RecentPage[];
    /** Asks the browser for the pages visited last. Resolves when they are in; a failure keeps the ones there were. */
    refresh(): Promise<void>;
  };
  /** The machine's processor and memory use, for the System Widget. Kept per tab and never saved. */
  readonly system: {
    view(): system.SystemView;
    /** Takes a reading. The Widget takes one every few seconds while it is shown; processor use needs two. */
    sample(): Promise<void>;
  };
  /** The GitHub Widget's contribution graph, read with a personal access token set in Settings. */
  readonly github: {
    /** Whether a token is set. The token itself never leaves the core. */
    hasToken(): boolean;
    view(): github.GitHubView;
    /** Sets the token (blank removes it), drops the old token's graph, and fetches the new one's. */
    setToken(token: string): Promise<void>;
    /**
     * Fetches the graph if the stored one is an hour old or there is none,
     * unless a fetch is already under way. A failed fetch keeps the last graph
     * and doesn't reject.
     */
    refresh(): Promise<void>;
  };
}

/**
 * The Recent, System and GitHub Widgets. The Desktop loading fetches the
 * GitHub graph if it is due; an imported backup fetches it afresh.
 */
export function createActivity(
  store: Store,
  edges: { browser?: BrowserLookup; fetch?: Fetch; system?: SystemMonitor },
): ActivityApi {
  const { clock } = store;
  const state = store.state;
  const { browser, fetch, system: monitor } = edges;

  /** The pages visited last, as the browser gave them at this tab's last refresh. */
  let recentVisits: VisitedPage[] = [];
  /** This tab's processor and memory readings. */
  let readings = system.noReadings();

  const graph = createRefresher(store, {
    source: (current) => (fetch && current.github.token ? current.github.token : undefined),
    same: (a, b) => a === b,
    isDue: (current, now) => github.isDue(current.github.contributions, now),
    load: async (token) =>
      github.parseContributions(
        await fetch!.json(github.GITHUB_GRAPHQL_URL, {
          method: 'POST',
          headers: { Authorization: `bearer ${token}` },
          body: { query: github.CONTRIBUTIONS_QUERY },
        }),
        clock.now().getTime(),
      ),
    store: (current, contributions) => ({ ...current, github: { ...current.github, contributions } }),
    problemOf: (error): github.GitHubProblem =>
      error instanceof FetchError && (error.status === 401 || error.status === 403) ? 'token' : 'unavailable',
  });
  void graph.refresh();
  store.onAdopt((_, { imported }) => {
    if (!imported) return;
    graph.forget();
    void graph.refresh(true);
  });

  return {
    recent: {
      pages: () => recent.recentPages(recentVisits, clock.now()),
      async refresh() {
        if (!browser) return;
        try {
          // Asks for extra, as the new tab itself and repeated pages are left out.
          recentVisits = await browser.recent(recent.RECENT_PAGES * 3);
          store.notify();
        } catch {
          // Keeps the pages there were.
        }
      },
    },
    system: {
      view: () => system.systemView(readings, !!monitor),
      async sample() {
        if (!monitor) return;
        try {
          readings = system.addReading(readings, await monitor.sample());
        } catch {
          readings = { ...readings, failed: true };
        }
        store.notify();
      },
    },
    github: {
      hasToken: () => !!state().github.token,
      view: () => github.gitHubView(!!state().github.token, state().github.contributions, { problem: graph.problem(), now: clock.now() }),
      async setToken(token) {
        graph.forget();
        await store.commit({ ...state(), github: { token: token.trim(), contributions: null } });
        void graph.refresh(true);
      },
      refresh: () => graph.refresh(),
    },
  };
}
