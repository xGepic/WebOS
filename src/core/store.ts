import type { Clock } from './edges';
import type { StateDocument } from './state/state';

/**
 * What each area of the core builds its part of the `WebOS` API on: the state
 * document this tab holds, and the way to change it.
 */
export interface Store {
  readonly clock: Clock;
  /** The state document as this tab holds it now. */
  state(): StateDocument;
  /** Takes `next` as the state, tells subscribers, and writes it to storage right away. */
  commit(next: StateDocument): Promise<void>;
  /**
   * Saves `next`, a backup being imported, and only then takes it as the
   * state: if saving fails, nothing in this tab has changed either.
   */
  replace(next: StateDocument): Promise<void>;
  /** Tells subscribers that something readable changed although the state didn't, such as a failed fetch. */
  notify(): void;
  /**
   * Calls `listener` whenever this tab takes on a new state (its own change,
   * another tab's, or an imported backup), before subscribers hear of it.
   */
  onAdopt(listener: (state: StateDocument, how: { imported: boolean }) => void): void;
}
