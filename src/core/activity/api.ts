import { FetchError, type BrowserLookup, type Fetch, type NetworkMonitor, type SystemMonitor, type TopSitePage, type VisitedPage } from '../edges';
import { createRefresher } from '../refresher';
import type { Store } from '../store';
import * as github from './github';
import * as newTabs from './new-tabs';
import * as recent from './recent';
import * as system from './system';
import * as top from './top-sites';

export interface ActivityApi {
  /** The pages visited last, for the Recent Widget. Kept per tab and never saved. */
  readonly recent: {
    /** The pages from the last `refresh`, latest first; none before one. */
    pages(): readonly recent.RecentPage[];
    /** Asks the browser for the pages visited last. Resolves when they are in; a failure keeps the ones there were. */
    refresh(): Promise<void>;
  };
  /** The sites visited most, for the Top Sites Widget. Kept per tab and never saved. */
  readonly topSites: {
    /** The sites from the last `refresh`, most visited first; none before one. */
    sites(): readonly top.TopSite[];
    /** Asks the browser for its most visited sites. Resolves when they are in; a failure keeps the ones there were. */
    refresh(): Promise<void>;
  };
  /** The New Tabs Widget: the new tabs opened today and on each of the six days before. Saved. */
  readonly newTabs: {
    view(): newTabs.NewTabsView;
    /** Counts a new tab today. webOS calls it once as a new tab opens, and not on a reload. */
    count(): Promise<void>;
  };
  /** The GitHub Widget's commits this month and last month, read with a personal access token set in Settings. */
  readonly github: {
    /** Whether a token is set. The token itself never leaves the core. */
    hasToken(): boolean;
    view(): github.GitHubView;
    /** Sets the token (blank removes it), drops the old token's counts, and fetches the new one's. */
    setToken(token: string): Promise<void>;
    /**
     * Fetches the counts if the stored ones are an hour old, from another
     * month, or missing, unless a fetch is already under way. A failed fetch
     * keeps the last counts and doesn't reject.
     */
    refresh(): Promise<void>;
  };
  /**
   * The System Widget: processor and memory use, the processor's name and the
   * network. The readings are kept per tab and never saved; which parts are
   * shown is saved.
   */
  readonly system: {
    view(): system.SystemView;
    /** Takes a reading. The Widget takes one every few seconds while it is shown; processor use needs two. */
    sample(): Promise<void>;
    /** Every part, in the Widget's order, with its name and whether it is shown, for Settings. */
    parts(): system.SystemPartChoice[];
    setShown(part: system.SystemPart, shown: boolean): Promise<void>;
  };
}

/**
 * The Recent, Top Sites, New Tabs, GitHub and System Widgets. The System Widget
 * follows the network as it changes. The Desktop loading fetches the GitHub
 * commit counts if they are due; an imported backup fetches them afresh.
 */
export function createActivity(
  store: Store,
  edges: { browser?: BrowserLookup; fetch?: Fetch; system?: SystemMonitor; network?: NetworkMonitor },
): ActivityApi {
  const { clock } = store;
  const { browser, fetch, system: monitor, network } = edges;
  const state = store.state;

  const commits = createRefresher(store, {
    source: (current) => (fetch && current.github.token ? current.github.token : undefined),
    same: (a, b) => a === b,
    isDue: (current, now) => github.isDue(current.github.commits, new Date(now)),
    load: async (token) => {
      const now = clock.now();
      return github.parseCommits(
        await fetch!.json(github.GITHUB_GRAPHQL_URL, {
          method: 'POST',
          headers: { Authorization: `bearer ${token}` },
          body: { query: github.COMMITS_QUERY, variables: github.commitsVariables(now) },
        }),
        now,
      );
    },
    store: (current, answer) => ({ ...current, github: { ...current.github, commits: answer } }),
    problemOf: (error): github.GitHubProblem =>
      error instanceof FetchError && (error.status === 401 || error.status === 403) ? 'token' : 'unavailable',
  });
  void commits.refresh();
  store.onAdopt((_, { imported }) => {
    if (!imported) return;
    commits.forget();
    void commits.refresh(true);
  });

  /** The pages visited last, as the browser gave them at this tab's last refresh. */
  let recentVisits: VisitedPage[] = [];
  /** The most visited sites, as the browser gave them at this tab's last refresh. */
  let mostVisited: TopSitePage[] = [];
  /** This tab's processor and memory readings. */
  let readings = system.noReadings();

  network?.onChange(() => store.notify());

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
    newTabs: {
      view: () => newTabs.newTabsView(state().newTabs, clock.now()),
      count: () => store.commit({ ...state(), newTabs: newTabs.withNewTab(state().newTabs, clock.now()) }),
    },
    github: {
      hasToken: () => !!state().github.token,
      view: () =>
        github.gitHubView(!!state().github.token, state().github.commits, { problem: commits.problem(), now: clock.now() }),
      async setToken(token) {
        commits.forget();
        await store.commit({ ...state(), github: { token: token.trim(), commits: null } });
        void commits.refresh(true);
      },
      refresh: () => commits.refresh(),
    },
    topSites: {
      sites: () => top.topSites(mostVisited),
      async refresh() {
        if (!browser) return;
        try {
          mostVisited = await browser.topSites();
          store.notify();
        } catch {
          // Keeps the sites there were.
        }
      },
    },
    system: {
      view: () => {
        const model = readings.last?.cpuModel;
        const reading = network?.read();
        return {
          shown: system.shownParts(state().systemWidget.hidden),
          usage: system.usageView(readings, !!monitor),
          ...(model ? { processor: system.processorName(model) } : {}),
          ...(reading ? { network: { online: reading.online, summary: system.networkSummary(reading) } } : {}),
        };
      },
      parts: () => system.partChoices(state().systemWidget.hidden),
      async setShown(part, shown) {
        const hidden = state().systemWidget.hidden;
        if (!hidden.includes(part) === shown) return;
        await store.commit({ ...state(), systemWidget: { hidden: system.withShown(hidden, part, shown) } });
      },
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
  };
}
