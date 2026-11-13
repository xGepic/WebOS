import type { Store } from '../store';
import * as base64 from './base64';
import * as devUtilities from './dev-utilities';
import * as diff from './diff';
import * as json from './json';
import * as timestamp from './timestamp';

export interface DevUtilitiesApi {
  /** The Dev Utilities App's conversions. They run locally; nothing leaves the machine. */
  readonly devUtilities: {
    /** The App's tabs, in order. */
    readonly tabs: typeof devUtilities.devUtilitiesTabs;
    /** The tab the App shows: the one last chosen, remembered across openings and tabs. JSON at first. */
    activeTab(): devUtilities.DevUtilitiesTab;
    setActiveTab(tab: devUtilities.DevUtilitiesTab): Promise<void>;
    /** Validates JSON and pretty-prints it, or says where the first syntax error is. */
    formatJson(text: string): json.JsonResult;
    /** Validates JSON and minifies it, or says where the first syntax error is. */
    minifyJson(text: string): json.JsonResult;
    /** Encodes text as UTF-8 Base64; URL-safe Base64 uses - and _ and leaves out the padding. */
    encodeBase64(text: string, options?: { urlSafe?: boolean }): string;
    /** Decodes standard or URL-safe Base64, padded or not, to UTF-8 text. */
    decodeBase64(encoded: string): base64.Base64Result;
    /**
     * The lines removed from `before` and added to make `after`, as a unified
     * diff with the changed part of each line marked and long unchanged runs
     * folded. Optionally ignores differences in whitespace.
     */
    diffText(before: string, after: string, options?: diff.DiffOptions): diff.DiffResult;
    /** Generates `count` random (v4) UUIDs, at least 1 and at most 100. */
    uuids(count: number): string[];
    /**
     * Converts a Unix timestamp or a date, whichever `text` is. A timestamp is
     * read as seconds below 100,000,000,000 and as milliseconds from there on.
     * A date without an offset is local time.
     */
    convertTime(text: string): timestamp.TimestampResult;
    /** The current moment, for the Timestamp tab's "now" button. */
    now(): timestamp.TimestampResult;
  };
}

/** The Dev Utilities App's conversions, and the tab it remembers. */
export function createDevUtilities(store: Store): DevUtilitiesApi {
  const { clock } = store;
  return {
    devUtilities: {
      tabs: devUtilities.devUtilitiesTabs,
      activeTab: () => devUtilities.activeTab(store.state().apps['dev-utilities']?.activeTab),
      setActiveTab: (tab) => {
        const state = store.state();
        return store.commit({ ...state, apps: { ...state.apps, 'dev-utilities': { ...state.apps['dev-utilities'], activeTab: tab } } });
      },
      formatJson: json.formatJson,
      minifyJson: json.minifyJson,
      encodeBase64: base64.encodeBase64,
      decodeBase64: base64.decodeBase64,
      diffText: diff.diffText,
      uuids: devUtilities.uuids,
      convertTime: timestamp.convertTime,
      now: () => timestamp.now(clock.now()),
    },
  };
}
