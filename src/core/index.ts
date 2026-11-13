import { apps } from './desktop/apps';
import * as backup from './state/backup';
import * as base64 from './dev-utilities/base64';
import * as calendar from './time/calendar';
import * as countdown from './time/countdown';
import * as desktop from './desktop/desktop';
import * as devUtilities from './dev-utilities/dev-utilities';
import type { BrowserLookup, Clock, Fetch, Storage, SystemMonitor, VisitedPage } from './edges';
import { FetchError } from './edges';
import { formatDate, formatTime } from './format';
import { greetingFor } from './organizer/greeting';
import * as github from './activity/github';
import * as json from './dev-utilities/json';
import * as jwt from './dev-utilities/jwt';
import * as launcher from './launcher/launcher';
import * as links from './organizer/links';
import * as moon from './sky/moon';
import * as notes from './organizer/notes';
import * as recent from './activity/recent';
import * as sun from './sky/sun';
import * as system from './activity/system';
import * as timestamp from './dev-utilities/timestamp';
import * as todos from './organizer/todos';
import * as weather from './sky/weather';
import * as worldClock from './time/world-clock';
import { loadState, toCurrentDocument, type StateDocument } from './state/state';

export type { AppId } from './desktop/apps';
export type { Cell, LayoutEntry, PlacedWidget, Placement, Span, WidgetDefinition, WidgetId, WidgetSize } from './desktop/desktop';
export type { BrowserLookup, BrowserPage, Clock, Fetch, FetchRequest, Storage, SystemMonitor, SystemSample, VisitedPage } from './edges';
export { FetchError } from './edges';
export type { Countdown, CountdownInput, CountdownView } from './time/countdown';
export type { WorldClockCity, WorldClockView } from './time/world-clock';
export { MAX_WORLD_CLOCKS } from './time/world-clock';
export type { MoonEvent, MoonPhase, MoonView } from './sky/moon';
export type { SunView } from './sky/sun';
export type { RecentPage } from './activity/recent';
export type { SystemView } from './activity/system';
export { CPU_HISTORY } from './activity/system';
export type { ContributionDay, ContributionLevel, GitHubProblem, GitHubView } from './activity/github';
export type { CalendarDay, CalendarDayDetails, CalendarMonth, CalendarWeek } from './time/calendar';
export type { WeatherCity, WeatherCondition, WeatherView } from './sky/weather';
export { describeCity } from './sky/weather';
export type { Base64Result } from './dev-utilities/base64';
export type { DevUtilitiesTab } from './dev-utilities/dev-utilities';
export type { JsonError, JsonResult } from './dev-utilities/json';
export type { JwtResult, JwtTime, JwtValidity } from './dev-utilities/jwt';
export type { ActionOutcome, ActionResult, LauncherResult } from './launcher/launcher';
export type { BackupFile } from './state/backup';
export type { Link, LinkGroup, LinkInput } from './organizer/links';
export type { ListedNote, Note } from './organizer/notes';
export type { TimestampResult } from './dev-utilities/timestamp';
export type { Todo } from './organizer/todos';
export { StateDocumentError } from './state/state';

export interface WebOSEdges {
  storage: Storage;
  clock: Clock;
  /** The browser's bookmarks and history, for the Launcher. Without it, the Launcher finds none. */
  browser?: BrowserLookup;
  /** The network, for the Weather and GitHub Widgets. Without it, nothing is fetched. */
  fetch?: Fetch;
  /** The machine's processors and memory, for the System Widget. Without it, the Widget says they are unavailable. */
  system?: SystemMonitor;
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
  /** Export to, and import from, a backup file holding all webOS data. */
  readonly backup: {
    /** A backup file of all webOS data: its suggested file name and its JSON text. */
    export(): backup.BackupFile;
    /**
     * Replaces all webOS data with a backup file's, as a whole, bringing an
     * older backup forward to this build's schema. Rejects with a
     * `StateDocumentError` saying what is wrong, without touching anything, if
     * the file isn't a backup this build can use.
     */
    import(text: string): Promise<void>;
  };
  readonly clock: {
    /** The current time in 12-hour format, e.g. "9:05 AM". */
    time(): string;
    /** Today's date, e.g. "Thursday, November 12". */
    date(): string;
  };
  readonly calendar: {
    /**
     * A month for the Calendar Widget, `offset` months from the current one
     * (0 by default), in weeks starting on Monday with ISO week numbers, today marked.
     */
    month(offset?: number): calendar.CalendarMonth;
    /** A day (`2026-11-30`) for the line under the grid: "Mon, Nov 30", "in 18 days", week 49. Undefined for text that isn't a date. */
    describe(date: string): calendar.CalendarDayDetails | undefined;
    /** The date `days` days after `date`, for moving through the grid with the keyboard. */
    addDays(date: string, days: number): string;
    /** The same day `months` months after `date`, or the last day of a shorter month. */
    addMonths(date: string, months: number): string;
    /** How many months from the current one the month of `date` is: the `offset` that shows it. */
    offsetOf(date: string): number;
    /** Today, as `2026-11-12`. */
    today(): string;
  };
  /**
   * The Weather Widget's weather for the city chosen in Settings, from
   * Open-Meteo. The last forecast is stored, so a new tab shows it at once; a
   * new tab fetches it again once it is 30 minutes old.
   */
  readonly weather: {
    /** The chosen city, or null before one is chosen. */
    city(): weather.WeatherCity | null;
    /** What the Weather Widget shows. */
    view(): weather.WeatherView;
    /** Up to five cities matching `query`, best first. Rejects if the search can't be made. */
    searchCities(query: string): Promise<weather.WeatherCity[]>;
    /** Chooses the city (or none, with null), drops the old city's weather, and fetches the new city's. */
    setCity(city: weather.WeatherCity | null): Promise<void>;
    /**
     * Fetches the weather if the stored forecast is 30 minutes old or there is
     * none, unless a fetch is already under way. Resolves when it is done; a
     * failed fetch keeps the last forecast and doesn't reject.
     */
    refresh(): Promise<void>;
  };
  /** Days the user counts down to, for the Countdown Widget, managed in Settings. */
  readonly countdowns: {
    /** Every Countdown, soonest first. */
    list(): readonly countdown.Countdown[];
    /** Today's and later Countdowns, soonest first, with the days to go. */
    upcoming(): readonly countdown.CountdownView[];
    /** Adds a Countdown. Resolves to its id, or undefined if the title is blank or the date isn't a real one. */
    add(input: countdown.CountdownInput): Promise<string | undefined>;
    /** Changes a Countdown. Resolves to whether it was changed: not with a blank title or a date that isn't real. */
    edit(id: string, input: countdown.CountdownInput): Promise<boolean>;
    delete(id: string): Promise<void>;
  };
  /** The World Clock's cities, managed in Settings. */
  readonly worldClock: {
    /** The cities, in the order the user put them. */
    cities(): readonly worldClock.WorldClockCity[];
    /** Each city's time now, and how it compares with the time here. */
    view(): readonly worldClock.WorldClockView[];
    /**
     * Adds a city found by `weather.searchCities` at the end. Resolves to
     * whether it was added: not without a time zone, if it is already there,
     * or once there are `MAX_WORLD_CLOCKS`.
     */
    add(city: weather.WeatherCity): Promise<boolean>;
    /** Moves a city to `toIndex` (clamped). */
    move(id: string, toIndex: number): Promise<void>;
    delete(id: string): Promise<void>;
  };
  /** The Moon tonight, computed locally. Seen from the Weather city's hemisphere (north without one). */
  readonly moon: {
    view(): moon.MoonView;
  };
  /** Sunrise and sunset in the Weather city, computed locally. */
  readonly sun: {
    view(): sun.SunView;
  };
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
export async function createWebOS({ storage, clock, browser, fetch, system: systemMonitor }: WebOSEdges): Promise<WebOS> {
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

  // The Desktop is loading: clear Todos completed 3 or more days ago, and Countdowns whose
  // day has passed, and save that.
  const remaining = todos.clearCompleted(state.todos, clock.now().getTime());
  const comingUp = countdown.clearPassed(state.countdowns, clock.now());
  if (remaining.length !== state.todos.length || comingUp.length !== state.countdowns.length) {
    await commit({ ...state, todos: remaining, countdowns: comingUp });
  }

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

  /** Adds a Todo at the end of the list. Resolves to its id, or undefined if the text is blank. */
  const addTodo = async (text: string) => {
    if (!text.trim()) return undefined;
    const id = crypto.randomUUID();
    await commitTodos((list) => todos.addTodo(list, { id, text, createdAt: clock.now().getTime() }));
    return id;
  };

  /** Creates a Note with `body` and selects it. Resolves to its id. */
  const createNote = async (body = '') => {
    const id = crypto.randomUUID();
    await commitSelection(id, { ...state, notes: notes.createNote(state.notes, { id, body }, clock.now().getTime()) });
    return id;
  };

  /** The weather fetch under way in this tab, if any. */
  let weatherFetch: Promise<void> | undefined;
  /** Whether this tab's last weather fetch failed. Per tab, so it isn't part of `state`. */
  let weatherFailed = false;

  /** Fetches the chosen city's weather if it is due, or if `force`d. See `weather.refresh`. */
  const refreshWeather = (force = false): Promise<void> => {
    const city = state.weather.city;
    if (!city || !fetch) return Promise.resolve();
    if (weatherFetch) return weatherFetch;
    if (!force && !weather.isDue(state.weather.report, clock.now().getTime())) return Promise.resolve();
    // The city may be changed while its weather is on the way; then the answer is ignored.
    const stillChosen = () => weather.sameCity(state.weather.city, city);
    weatherFetch = (async () => {
      try {
        const report = weather.parseForecast(await fetch.json(weather.forecastUrl(city)), clock.now().getTime());
        if (stillChosen()) {
          weatherFailed = false;
          await commit({ ...state, weather: { ...state.weather, report } });
        }
      } catch {
        if (stillChosen()) {
          weatherFailed = true;
          notify();
        }
      } finally {
        weatherFetch = undefined;
      }
      // The city changed while this fetch was under way: fetch the new city's weather now.
      if (!stillChosen()) await refreshWeather();
    })();
    return weatherFetch;
  };

  // The Desktop is loading: fetch the weather in the background if it is due.
  void refreshWeather();

  /** The GitHub fetch under way in this tab, if any. */
  let gitHubFetch: Promise<void> | undefined;
  /** Why this tab's last GitHub fetch failed, if it did. Per tab, so it isn't part of `state`. */
  let gitHubProblem: github.GitHubProblem | undefined;

  /** Fetches the contribution graph if it is due, or if `force`d. See `github.refresh`. */
  const refreshGitHub = (force = false): Promise<void> => {
    const token = state.github.token;
    if (!token || !fetch) return Promise.resolve();
    if (gitHubFetch) return gitHubFetch;
    if (!force && !github.isDue(state.github.contributions, clock.now().getTime())) return Promise.resolve();
    // The token may be changed while the graph is on the way; then the answer is ignored.
    const stillSet = () => state.github.token === token;
    gitHubFetch = (async () => {
      try {
        const response = await fetch.json(github.GITHUB_GRAPHQL_URL, {
          method: 'POST',
          headers: { Authorization: `bearer ${token}` },
          body: { query: github.CONTRIBUTIONS_QUERY },
        });
        const contributions = github.parseContributions(response, clock.now().getTime());
        if (stillSet()) {
          gitHubProblem = undefined;
          await commit({ ...state, github: { ...state.github, contributions } });
        }
      } catch (error) {
        if (stillSet()) {
          gitHubProblem = error instanceof FetchError && (error.status === 401 || error.status === 403) ? 'token' : 'unavailable';
          notify();
        }
      } finally {
        gitHubFetch = undefined;
      }
      // The token changed while this fetch was under way: fetch the new token's graph now.
      if (!stillSet()) await refreshGitHub(true);
    })();
    return gitHubFetch;
  };

  // The Desktop is loading: fetch the contribution graph in the background if it is due.
  void refreshGitHub();

  /** The pages visited last, as the browser gave them at this tab's last refresh. */
  let recentVisits: VisitedPage[] = [];
  /** This tab's processor and memory readings. */
  let systemReadings = system.noReadings();

  return {
    apps,
    todos: {
      open: () => todos.openTodos(state.todos),
      completed: () => todos.completedTodos(state.todos),
      add: addTodo,
      complete: (id) => commitTodos((list) => todos.setCompleted(list, id, clock.now().getTime())),
      uncomplete: (id) => commitTodos((list) => todos.setCompleted(list, id, null)),
      editText: (id, text) => commitTodos((list) => todos.editText(list, id, text)),
      delete: (id) => commitTodos((list) => todos.deleteTodo(list, id)),
      move: (id, toIndex) => commitTodos((list) => todos.moveTodo(list, id, toIndex)),
    },
    notes: {
      list: () => notes.listNotes(state, clock.now()),
      create: createNote,
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
          linkGroups: state.linkGroups,
          todos: todos.openTodos(state.todos),
          notes: notes.listNotes(state, clock.now()),
          bookmarks,
          history,
        });
      },
      async run(action) {
        if (action.queryToFill !== undefined) return undefined;
        switch (action.action) {
          case 'new-todo': {
            const todoId = await addTodo(action.text);
            return todoId && { kind: 'todo-added', todoId };
          }
          case 'new-note':
            return { kind: 'note-created', noteId: await createNote(action.text) };
          case 'uuid':
            return { kind: 'copy', text: devUtilities.uuids(1)[0] };
        }
      },
    },
    backup: {
      export: () => backup.exportFile(state, clock.now()),
      async import(text) {
        // A backup holds no GitHub token: this machine keeps its own, and fetches its graph afresh.
        const imported = backup.importDocument(text);
        const next = withSafeLayout({ ...imported, github: { token: state.github.token, contributions: null } });
        // Saved before this tab takes it on: if saving fails, nothing here has changed either.
        await storage.write(next);
        // This tab shows the Note the backup remembers, like a tab that has just opened.
        shownNoteId = notes.shownNoteId(next.notes, next.apps.notes?.selectedNoteId);
        gitHubProblem = undefined;
        adopt(next);
        void refreshGitHub(true);
      },
    },
    clock: {
      time: () => formatTime(clock.now()),
      date: () => formatDate(clock.now()),
    },
    calendar: {
      month: (offset = 0) => calendar.monthView(clock.now(), offset),
      describe: (date) => calendar.describeDay(date, clock.now()),
      addDays: calendar.addDays,
      addMonths: calendar.addMonths,
      offsetOf: (date) => calendar.monthOffset(date, clock.now()),
      today: () => calendar.isoDate(clock.now()),
    },
    weather: {
      city: () => state.weather.city,
      view: () => weather.weatherView(state.weather.city, state.weather.report, { failed: weatherFailed, now: clock.now() }),
      async searchCities(query) {
        if (!query.trim() || !fetch) return [];
        return weather.parseCities(await fetch.json(weather.citySearchUrl(query)));
      },
      async setCity(city) {
        weatherFailed = false;
        await commit({ ...state, weather: { city, report: null } });
        void refreshWeather(true);
      },
      refresh: () => refreshWeather(),
    },
    countdowns: {
      list: () => [...state.countdowns].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)),
      upcoming: () => countdown.upcoming(state.countdowns, clock.now()),
      async add(input) {
        const id = crypto.randomUUID();
        const list = countdown.addCountdown(state.countdowns, id, input);
        if (!list) return undefined;
        await commit({ ...state, countdowns: list });
        return id;
      },
      async edit(id, input) {
        const list = countdown.editCountdown(state.countdowns, id, input);
        if (!list) return false;
        await commit({ ...state, countdowns: list });
        return true;
      },
      delete: (id) => commit({ ...state, countdowns: countdown.deleteCountdown(state.countdowns, id) }),
    },
    worldClock: {
      cities: () => state.worldClocks,
      view: () => worldClock.worldClockView(state.worldClocks, clock.now()),
      async add(city) {
        const list = city.timeZone
          ? worldClock.addWorldClock(state.worldClocks, {
              id: crypto.randomUUID(),
              name: city.name,
              country: city.country,
              timeZone: city.timeZone,
            })
          : undefined;
        if (!list) return false;
        await commit({ ...state, worldClocks: list });
        return true;
      },
      move: (id, toIndex) => commit({ ...state, worldClocks: worldClock.moveWorldClock(state.worldClocks, id, toIndex) }),
      delete: (id) => commit({ ...state, worldClocks: worldClock.deleteWorldClock(state.worldClocks, id) }),
    },
    moon: {
      view: () => moon.moonView(clock.now(), state.weather.city?.latitude),
    },
    sun: {
      view: () => sun.sunView(state.weather.city, clock.now()),
    },
    recent: {
      pages: () => recent.recentPages(recentVisits, clock.now()),
      async refresh() {
        if (!browser) return;
        try {
          // Asks for extra, as the new tab itself and repeated pages are left out.
          recentVisits = await browser.recent(recent.RECENT_PAGES * 3);
          notify();
        } catch {
          // Keeps the pages there were.
        }
      },
    },
    system: {
      view: () => system.systemView(systemReadings, !!systemMonitor),
      async sample() {
        if (!systemMonitor) return;
        try {
          systemReadings = system.addReading(systemReadings, await systemMonitor.sample());
        } catch {
          systemReadings = { ...systemReadings, failed: true };
        }
        notify();
      },
    },
    github: {
      hasToken: () => !!state.github.token,
      view: () =>
        github.gitHubView(!!state.github.token, state.github.contributions, { problem: gitHubProblem, now: clock.now() }),
      async setToken(token) {
        gitHubProblem = undefined;
        await commit({ ...state, github: { token: token.trim(), contributions: null } });
        void refreshGitHub(true);
      },
      refresh: () => refreshGitHub(),
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
