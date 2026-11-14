import type { BrowserLookup, DisplayMonitor, DisplayReading, NetworkMonitor, SystemMonitor, VisitedPage } from '../edges';
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
  /**
   * The System Widget: processor and memory use, the processor's name, the
   * network and the displays. The readings are kept per tab and never saved;
   * which parts are shown is saved.
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

/** The Recent and System Widgets. The System Widget follows the network and the displays as they change. */
export function createActivity(
  store: Store,
  edges: { browser?: BrowserLookup; system?: SystemMonitor; network?: NetworkMonitor; displays?: DisplayMonitor },
): ActivityApi {
  const { clock } = store;
  const { browser, system: monitor, network, displays: displayMonitor } = edges;
  const state = store.state;

  /** The pages visited last, as the browser gave them at this tab's last refresh. */
  let recentVisits: VisitedPage[] = [];
  /** This tab's processor and memory readings. */
  let readings = system.noReadings();
  /** The displays as last read. */
  let displays: DisplayReading[] = [];

  network?.onChange(() => store.notify());
  const readDisplays = async () => {
    try {
      displays = await displayMonitor!.displays();
      store.notify();
    } catch {
      // Keeps the displays there were.
    }
  };
  if (displayMonitor) {
    void readDisplays();
    displayMonitor.onChange(() => void readDisplays());
  }

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
      view: () => {
        const model = readings.last?.cpuModel;
        const reading = network?.read();
        return {
          shown: system.shownParts(state().systemWidget.hidden),
          usage: system.usageView(readings, !!monitor),
          ...(model ? { processor: system.processorName(model) } : {}),
          ...(reading ? { network: { online: reading.online, summary: system.networkSummary(reading) } } : {}),
          displays: system.displayViews(displays),
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
