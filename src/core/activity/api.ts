import type { BrowserLookup, SystemMonitor, VisitedPage } from '../edges';
import type { Store } from '../store';
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
}

/** The Recent and System Widgets. */
export function createActivity(
  store: Store,
  edges: { browser?: BrowserLookup; system?: SystemMonitor },
): ActivityApi {
  const { clock } = store;
  const { browser, system: monitor } = edges;

  /** The pages visited last, as the browser gave them at this tab's last refresh. */
  let recentVisits: VisitedPage[] = [];
  /** This tab's processor and memory readings. */
  let readings = system.noReadings();

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
  };
}
