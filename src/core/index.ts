import { apps } from './apps';
import * as base64 from './base64';
import * as desktop from './desktop';
import * as devUtilities from './dev-utilities';
import type { Clock, Storage } from './edges';
import { formatDate, formatTime } from './format';
import { greetingFor } from './greeting';
import * as json from './json';
import * as jwt from './jwt';
import * as links from './links';
import * as notes from './notes';
import * as timestamp from './timestamp';
import * as todos from './todos';
import { loadState, toCurrentDocument, type StateDocument } from './state';

export type { AppId } from './apps';
export type { Cell, LayoutEntry, PlacedWidget, Placement, Span, WidgetDefinition, WidgetId, WidgetSize } from './desktop';
export type { Clock, Storage } from './edges';
export type { Base64Result } from './base64';
export type { DevUtilitiesTab } from './dev-utilities';
export type { JsonError, JsonResult } from './json';
export type { JwtResult, JwtTime, JwtValidity } from './jwt';
export type { Link, LinkGroup, LinkInput } from './links';
export type { ListedNote, Note } from './notes';
export type { TimestampResult } from './timestamp';
export type { Todo } from './todos';
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
  readonly todos: {
    /** Open Todos in display order. */
    open(): readonly todos.Todo[];
    /** Completed Todos, most recently completed first. */
    completed(): readonly todos.Todo[];
    /** Adds a Todo at the end of the list. Resolves to its id, or undefined if the text is blank. */
    add(text: string): Promise<string | undefined>;
    /** Checks a Todo off, recording the current time. */
    complete(id: string): Promise<void>;
    /** Unchecks a Todo, which returns to its place and is no longer due to be cleared. */
    uncomplete(id: string): Promise<void>;
    /** Replaces a Todo's text; blank text is ignored. */
    editText(id: string, text: string): Promise<void>;
    delete(id: string): Promise<void>;
    /** Moves an open Todo to `toIndex` among the open Todos (clamped). */
    move(id: string, toIndex: number): Promise<void>;
  };
  readonly notes: {
    /** Every Note with its title, most recently edited first. */
    list(): readonly notes.ListedNote[];
    /** Creates a Note with `body` (empty by default) and selects it. Resolves to its id. */
    create(body?: string): Promise<string>;
    /** Replaces a Note's body, recording the edit time. An unchanged body is not an edit. */
    edit(id: string, body: string): Promise<void>;
    delete(id: string): Promise<void>;
    /**
     * The Note the Notes App shows in this tab. It starts as the remembered
     * selection (or the most recently edited Note) and changes only by this
     * tab's own commands, or when the Note is deleted: then it falls back to the
     * most recently edited Note. Another tab selecting or editing Notes never
     * swaps it. Undefined when there are no Notes.
     */
    selected(): notes.ListedNote | undefined;
    /** Selects a Note in this tab, and remembers it for the next time the Notes App opens in any tab. */
    select(id: string): Promise<void>;
    /** Makes a Note the Pinned Note, replacing any other. */
    pin(id: string): Promise<void>;
    /** Leaves no Note pinned. */
    unpin(): Promise<void>;
    /**
     * The Note the Notes Widget previews: the Pinned Note, or the most recently
     * edited Note when none is pinned. Undefined when there are no Notes.
     */
    forWidget(): notes.ListedNote | undefined;
  };
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
     * Decodes a JWT's header and payload, with its time claims as dates and
     * whether it has expired or isn't valid yet. The signature is not verified.
     */
    decodeJwt(token: string): jwt.JwtResult;
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
  readonly desktop: {
    /** The snap grid, in cells. */
    readonly grid: typeof desktop.grid;
    /** The Widget catalog: every Widget and the cells each size spans. */
    readonly widgets: typeof desktop.widgets;
    /** The visible Widgets and where they sit, in reading order. */
    layout(): readonly desktop.PlacedWidget[];
    /** The hidden Widgets, in catalog order; Edit Mode offers to show them. */
    hidden(): readonly desktop.WidgetId[];
    /**
     * Moves a Widget so its top-left cell is `column`, `row`, kept on the grid.
     * Widgets it lands on move to the next free position, so Widgets never
     * overlap. Resolves to whether it moved: a move that would leave a pushed
     * Widget no room anywhere is refused, and nothing changes.
     */
    move(widget: desktop.WidgetId, column: number, row: number): Promise<boolean>;
    /**
     * Where a Widget of `size` with its top-left at `cell` would sit: the
     * nearest cell that keeps all of it on the grid, as `move` would place it.
     */
    fitOnGrid(widget: desktop.WidgetId, size: desktop.WidgetSize, cell: desktop.Cell): desktop.Cell;
    /** Resizes a Widget, pushing aside the Widgets it grows over as `move` does. Resolves to whether it was resized. */
    resize(widget: desktop.WidgetId, size: desktop.WidgetSize): Promise<boolean>;
    hide(widget: desktop.WidgetId): Promise<void>;
    /**
     * Shows a hidden Widget where it was, or at the next free position. Resolves
     * to whether it is shown: with no room for it, it stays hidden.
     */
    show(widget: desktop.WidgetId): Promise<boolean>;
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
 * Creates the webOS core, as the Desktop loads. Completed Todos that are due
 * to be cleared are cleared now. Rejects with a `StateDocumentError` if the stored
 * state can't be used, without touching it.
 */
export async function createWebOS({ storage, clock }: WebOSEdges): Promise<WebOS> {
  /** A document with its layout made safe to use; see `desktop.normalizeLayout`. */
  const withSafeLayout = (document: StateDocument): StateDocument => ({ ...document, layout: desktop.normalizeLayout(document.layout) });
  let state = withSafeLayout(await loadState(storage));
  /** The Note this tab's Notes App shows; see `notes.selected`. Kept per tab, so it isn't part of `state`. */
  let shownNoteId = notes.shownNoteId(state.notes, state.apps.notes?.selectedNoteId);
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const stopMinuteTicks = clock.onMinute(notify);

  /** Takes `next` as the state, keeps the shown Note one that exists, and tells subscribers. */
  const adopt = (next: StateDocument) => {
    state = next;
    shownNoteId = notes.shownNoteId(state.notes, shownNoteId);
    notify();
  };

  /** Replaces the state, tells subscribers, and writes it to storage right away. */
  const commit = (next: StateDocument) => {
    adopt(next);
    return storage.write(next);
  };

  // The Desktop is loading: clear Todos completed 3 or more days ago, and save that.
  const remaining = todos.clearCompleted(state.todos, clock.now().getTime());
  if (remaining.length !== state.todos.length) await commit({ ...state, todos: remaining });

  // Another tab saved: adopt its document, so this tab never writes back a stale copy.
  // A document this build can't use is ignored rather than adopted.
  const stopExternalChanges = storage.onExternalChange((document) => {
    let next: StateDocument;
    try {
      next = toCurrentDocument(document);
    } catch {
      return;
    }
    adopt(withSafeLayout(next));
  });

  /** Applies a change to the Link Groups. Deleted Links leave the Dock with them. */
  const commitLinks = (change: (groups: readonly links.LinkGroup[]) => links.LinkGroup[]) => {
    const linkGroups = change(state.linkGroups);
    return commit({ ...state, linkGroups, dockedLinkIds: links.pruneDock(linkGroups, state.dockedLinkIds) });
  };

  /** Applies a change to the Notes. */
  /** Applies a change to the Notes. Deleting the Pinned Note leaves none pinned. */
  const commitNotes = (change: (list: readonly notes.Note[]) => notes.Note[]) => {
    const list = change(state.notes);
    return commit({ ...state, notes: list, pinnedNoteId: notes.prunePin(list, state.pinnedNoteId) });
  };

  /** Shows a Note in this tab and remembers it as the Notes App's selection, saved with `next`. */
  const commitSelection = (id: string, next: StateDocument = state) => {
    shownNoteId = id;
    return commit({ ...next, apps: { ...next.apps, notes: { ...next.apps.notes, selectedNoteId: id } } });
  };

  /** Applies a change to the Desktop layout, unless it was refused (undefined). Resolves to whether it was applied. */
  const commitLayout = async (change: (entries: readonly desktop.LayoutEntry[]) => desktop.LayoutEntry[] | undefined) => {
    const layout = change(state.layout);
    if (!layout) return false;
    await commit({ ...state, layout });
    return true;
  };

  /** Applies a change to the Todos. */
  const commitTodos = (change: (list: readonly todos.Todo[]) => todos.Todo[]) =>
    commit({ ...state, todos: change(state.todos) });

  return {
    apps,
    todos: {
      open: () => todos.openTodos(state.todos),
      completed: () => todos.completedTodos(state.todos),
      async add(text) {
        if (!text.trim()) return undefined;
        const id = crypto.randomUUID();
        await commitTodos((list) => todos.addTodo(list, { id, text, createdAt: clock.now().getTime() }));
        return id;
      },
      complete: (id) => commitTodos((list) => todos.setCompleted(list, id, clock.now().getTime())),
      uncomplete: (id) => commitTodos((list) => todos.setCompleted(list, id, null)),
      editText: (id, text) => commitTodos((list) => todos.editText(list, id, text)),
      delete: (id) => commitTodos((list) => todos.deleteTodo(list, id)),
      move: (id, toIndex) => commitTodos((list) => todos.moveTodo(list, id, toIndex)),
    },
    notes: {
      list: () => notes.listNotes(state, clock.now()),
      async create(body = '') {
        const id = crypto.randomUUID();
        await commitSelection(id, { ...state, notes: notes.createNote(state.notes, { id, body }, clock.now().getTime()) });
        return id;
      },
      edit: (id, body) => commitNotes((list) => notes.editNote(list, id, body, clock.now().getTime())),
      delete: (id) => commitNotes((list) => notes.deleteNote(list, id)),
      selected: () => notes.listedNote(state, shownNoteId, clock.now()),
      select: (id) => commitSelection(id),
      pin: (id) => commit({ ...state, pinnedNoteId: notes.pinNote(state, id) }),
      unpin: () => commit({ ...state, pinnedNoteId: null }),
      forWidget: () => notes.listedNote(state, notes.shownNoteId(state.notes, state.pinnedNoteId), clock.now()),
    },
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
    devUtilities: {
      tabs: devUtilities.devUtilitiesTabs,
      activeTab: () => devUtilities.activeTab(state.apps['dev-utilities']?.activeTab),
      setActiveTab: (tab) =>
        commit({ ...state, apps: { ...state.apps, 'dev-utilities': { ...state.apps['dev-utilities'], activeTab: tab } } }),
      formatJson: json.formatJson,
      minifyJson: json.minifyJson,
      encodeBase64: base64.encodeBase64,
      decodeBase64: base64.decodeBase64,
      decodeJwt: (token) => jwt.decodeJwt(token, clock.now()),
      uuids: devUtilities.uuids,
      convertTime: timestamp.convertTime,
      now: () => timestamp.now(clock.now()),
    },
    desktop: {
      grid: desktop.grid,
      widgets: desktop.widgets,
      layout: () => desktop.placedWidgets(state.layout),
      hidden: () => desktop.hiddenWidgets(state.layout),
      fitOnGrid: desktop.fitOnGrid,
      move: (widget, column, row) => commitLayout((entries) => desktop.moveWidget(entries, widget, column, row)),
      resize: (widget, size) => commitLayout((entries) => desktop.resizeWidget(entries, widget, size)),
      hide: async (widget) => {
        await commitLayout((entries) => desktop.hideWidget(entries, widget));
      },
      show: (widget) => commitLayout((entries) => desktop.showWidget(entries, widget)),
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
