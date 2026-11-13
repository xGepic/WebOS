import type { StateDocument } from './state/state';
import type { Store } from './store';

/** Keeps a stored answer from the network fresh. See `createRefresher`. */
export interface Refresher<Problem> {
  /**
   * Fetches the answer if it is due, or if `force`d, unless a fetch is already
   * under way (then it waits for that one). Resolves when it is done; a failed
   * fetch keeps the stored answer and doesn't reject.
   */
  refresh(force?: boolean): Promise<void>;
  /** Why this tab's last fetch failed, if it did. Per tab, so it isn't part of the state. */
  problem(): Problem | undefined;
  /** Forgets the last failure, when what is fetched for changes. */
  forget(): void;
}

export interface RefresherOptions<Source, Answer, Problem> {
  /** What the answer is fetched for (the Weather city), or undefined when there is nothing to fetch. */
  source(state: StateDocument): Source | undefined;
  /** Whether two sources are the same, so an answer for one still fits the other. */
  same(a: Source, b: Source): boolean;
  /** Whether the stored answer is old enough, or missing, to be fetched again. */
  isDue(state: StateDocument, now: number): boolean;
  /** Fetches and reads the answer for `source`. Rejects when it can't. */
  load(source: Source): Promise<Answer>;
  /** The state with `answer` stored. */
  store(state: StateDocument, answer: Answer): StateDocument;
  /** Why a fetch failed, from what it rejected with. */
  problemOf(error: unknown): Problem;
}

/**
 * Stale-while-revalidate for one stored answer from the network: the stored
 * answer is shown at once, and fetched again when it is due, one fetch at a
 * time. If the source changes while an answer is on the way, that answer is
 * ignored and the new source's is fetched instead.
 */
export function createRefresher<Source, Answer, Problem>(
  store: Store,
  options: RefresherOptions<Source, Answer, Problem>,
): Refresher<Problem> {
  /** The fetch under way in this tab, if any. */
  let underWay: Promise<void> | undefined;
  let problem: Problem | undefined;

  const refresh = (force = false): Promise<void> => {
    const source = options.source(store.state());
    if (source === undefined) return Promise.resolve();
    if (underWay) return underWay;
    if (!force && !options.isDue(store.state(), store.clock.now().getTime())) return Promise.resolve();
    const stillCurrent = () => {
      const now = options.source(store.state());
      return now !== undefined && options.same(now, source);
    };
    underWay = (async () => {
      try {
        const answer = await options.load(source);
        if (stillCurrent()) {
          problem = undefined;
          await store.commit(options.store(store.state(), answer));
        }
      } catch (error) {
        if (stillCurrent()) {
          problem = options.problemOf(error);
          store.notify();
        }
      } finally {
        underWay = undefined;
      }
      // The source changed while this fetch was under way: fetch the new source's answer now.
      if (!stillCurrent()) await refresh(true);
    })();
    return underWay;
  };

  return {
    refresh,
    problem: () => problem,
    forget: () => {
      problem = undefined;
    },
  };
}
