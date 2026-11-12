import { apps } from './apps';
import * as desktop from './desktop';
import type { Clock, Storage } from './edges';
import { formatDate, formatTime } from './format';
import { greetingFor } from './greeting';
import * as links from './links';
import { loadState, toCurrentDocument, type StateDocument } from './state';

export type { AppId } from './apps';
export type { PlacedWidget, Placement, Span, WidgetDefinition, WidgetId, WidgetSize } from './desktop';
export type { Clock, Storage } from './edges';
export type { Link, LinkGroup, LinkInput } from './links';
export { StateDocumentError } from './state';

export interface WebOSEdges {
  storage: Storage;
  clock: Clock;
}

export interface WebOS {
  /** Every App, in Dock order. */
  readonly apps: typeof apps;
  readonly profile: {
    /** The greeting for the current time of day, with the name if one is set: "Good morning, Stefan". */
    greeting(): string;
    /** The name as the user typed it; empty when not set. */
    name(): string;
    /** Sets the name the greeting uses, and saves it. */
    setName(name: string): Promise<void>;
  };
  readonly links: {
    /** Link Groups in display order, each with its Links in display order. */
    groups(): readonly links.LinkGroup[];
    /** Adds a Link Group at the end. Resolves to its id. */
    addGroup(name: string): Promise<string>;
    /** Adds a Link at the end of a Link Group, normalising its URL. Resolves to its id. */
    addLink(groupId: string, link: links.LinkInput): Promise<string>;
    /** Moves a Link Group to `toIndex` (clamped to the list). */
    moveGroup(groupId: string, toIndex: number): Promise<void>;
    /** Moves a Link to `toIndex` (clamped) in a Link Group, which may be the one it is in. */
    moveLink(linkId: string, toGroupId: string, toIndex: number): Promise<void>;
    renameGroup(groupId: string, name: string): Promise<void>;
    /** Replaces a Link's title and URL, normalising the URL. */
    editLink(linkId: string, link: links.LinkInput): Promise<void>;
    deleteLink(linkId: string): Promise<void>;
    /** Deletes a Link Group together with all of its Links. */
    deleteGroup(groupId: string): Promise<void>;
    /** The Docked Links, in Dock order. */
    docked(): readonly links.Link[];
    /** Adds a Link to the end of the Dock. */
    dock(linkId: string): Promise<void>;
    /** Takes a Link out of the Dock; the Link itself stays. */
    undock(linkId: string): Promise<void>;
    /** Moves a Docked Link to `toIndex` in the Dock (clamped). */
    moveDocked(linkId: string, toIndex: number): Promise<void>;
  };
  readonly desktop: {
    /** The snap grid, in cells. */
    readonly grid: typeof desktop.grid;
    /** The Widget catalog: every Widget and the cells each size spans. */
    readonly widgets: typeof desktop.widgets;
    /** The Widgets on the Desktop and where they sit. */
    layout(): readonly desktop.PlacedWidget[];
  };
  readonly clock: {
    /** The current time in 12-hour format, e.g. "9:05 AM". */
    time(): string;
    /** Today's date, e.g. "Thursday, November 12". */
    date(): string;
  };
  /**
   * Calls `listener` whenever anything readable from the core may have changed,
   * including the time at the start of every minute. Returns an unsubscribe function.
   */
  subscribe(listener: () => void): () => void;
  /** Stops the core's timers and its listening for other tabs' changes. */
  dispose(): void;
}

/**
 * Creates the webOS core. Rejects with a `StateDocumentError` if the stored
 * state can't be used, without touching it.
 */
export async function createWebOS({ storage, clock }: WebOSEdges): Promise<WebOS> {
  let state = await loadState(storage);
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const stopMinuteTicks = clock.onMinute(notify);

  /** Replaces the state, tells subscribers, and writes it to storage right away. */
  const commit = (next: StateDocument) => {
    state = next;
    notify();
    return storage.write(next);
  };

  // Another tab saved: adopt its document, so this tab never writes back a stale copy.
  // A document this build can't use is ignored rather than adopted.
  const stopExternalChanges = storage.onExternalChange((document) => {
    try {
      state = toCurrentDocument(document);
    } catch {
      return;
    }
    notify();
  });

  /** Applies a change to the Link Groups. Deleted Links leave the Dock with them. */
  const commitLinks = (change: (groups: readonly links.LinkGroup[]) => links.LinkGroup[]) => {
    const linkGroups = change(state.linkGroups);
    return commit({ ...state, linkGroups, dockedLinkIds: links.pruneDock(linkGroups, state.dockedLinkIds) });
  };

  return {
    apps,
    links: {
      groups: () => state.linkGroups,
      async addGroup(name) {
        const id = crypto.randomUUID();
        await commitLinks((groups) => links.addGroup(groups, id, name));
        return id;
      },
      async addLink(groupId, link) {
        const id = crypto.randomUUID();
        await commitLinks((groups) => links.addLink(groups, groupId, id, link));
        return id;
      },
      moveGroup: (groupId, toIndex) => commitLinks((groups) => links.moveGroup(groups, groupId, toIndex)),
      moveLink: (linkId, toGroupId, toIndex) =>
        commitLinks((groups) => links.moveLink(groups, linkId, toGroupId, toIndex)),
      renameGroup: (groupId, name) => commitLinks((groups) => links.renameGroup(groups, groupId, name)),
      editLink: (linkId, link) => commitLinks((groups) => links.editLink(groups, linkId, link)),
      deleteLink: (linkId) => commitLinks((groups) => links.deleteLink(groups, linkId)),
      deleteGroup: (groupId) => commitLinks((groups) => links.deleteGroup(groups, groupId)),
      docked: () => links.dockedLinks(state.linkGroups, state.dockedLinkIds),
      dock: (linkId) => commit({ ...state, dockedLinkIds: links.dock(state.linkGroups, state.dockedLinkIds, linkId) }),
      undock: (linkId) => commit({ ...state, dockedLinkIds: links.undock(state.dockedLinkIds, linkId) }),
      moveDocked: (linkId, toIndex) =>
        commit({ ...state, dockedLinkIds: links.moveDocked(state.linkGroups, state.dockedLinkIds, linkId, toIndex) }),
    },
    profile: {
      name: () => state.profile.name,
      greeting: () => greetingFor(clock.now(), state.profile.name),
      setName: (name) => commit({ ...state, profile: { ...state.profile, name } }),
    },
    desktop: {
      grid: desktop.grid,
      widgets: desktop.widgets,
      layout: desktop.layout,
    },
    clock: {
      time: () => formatTime(clock.now()),
      date: () => formatDate(clock.now()),
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      stopMinuteTicks();
      stopExternalChanges();
    },
  };
}
