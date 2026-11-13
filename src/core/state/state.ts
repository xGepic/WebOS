import { defaultLayout, type LayoutEntry } from '../desktop/desktop';
import type { Storage } from '../edges';
import { isFiniteNumber, isRecord, isText } from '../guards';
import type { LinkGroup } from '../organizer/links';
import type { Note } from '../organizer/notes';
import type { Countdown } from '../time/countdown';
import type { GitHubContributions } from '../activity/github';
import type { Todo } from '../organizer/todos';
import type { WeatherCity, WeatherReport } from '../sky/weather';
import type { WorldClockCity } from '../time/world-clock';

/**
 * The single persisted state document. Later tickets add Notes and the
 * Desktop layout here, each with a migration.
 */
export interface StateDocument {
  schemaVersion: typeof SCHEMA_VERSION;
  profile: {
    /** As typed in Settings; the greeting trims it. Empty when not set. */
    name: string;
  };
  /** What each App remembers between openings, such as the selected Note. */
  apps: AppMemory;
  /** Link Groups in display order, each holding its Links in display order. */
  linkGroups: LinkGroup[];
  /** The ids of the Docked Links, in Dock order. Independent of the Link Groups' order. */
  dockedLinkIds: string[];
  /** Every Todo, open and completed, in display order. */
  todos: Todo[];
  /** Every Note, in the order they were created. */
  notes: Note[];
  /** The Note the Notes Widget previews, or null when none is pinned. */
  pinnedNoteId: string | null;
  /** Every Widget once: where it sits, its size, and whether it is shown. */
  layout: LayoutEntry[];
  weather: {
    /** The city chosen in Settings, or null before one is chosen. */
    city: WeatherCity | null;
    /** The last forecast fetched for that city. A cache: backups leave it out. */
    report: WeatherReport | null;
  };
  /** The Countdowns, in the order they were added. The Widget shows them soonest first. */
  countdowns: Countdown[];
  /** The World Clock's cities, in the order the user put them. */
  worldClocks: WorldClockCity[];
  github: {
    /** The personal access token the GitHub Widget reads with; empty when not set. Backups leave it out. */
    token: string;
    /** The last contribution graph fetched with it. A cache: backups leave it out. */
    contributions: GitHubContributions | null;
  };
}

const SCHEMA_VERSION = 12;

type Migration = (document: Record<string, unknown>) => Record<string, unknown>;

/**
 * `migrations[n]` brings a version-n document to version n + 1.
 * Version 0 is any document written before documents carried a schema version.
 * Each migration spells out its own values rather than reusing `freshDocument`,
 * because a migration must keep producing exactly that version forever.
 */
const migrations: Record<number, Migration> = {
  0: () => ({ schemaVersion: 1 }),
  1: (document) => ({ ...document, schemaVersion: 2, profile: { name: '' }, apps: {} }),
  2: (document) => ({ ...document, schemaVersion: 3, linkGroups: [] }),
  3: (document) => ({ ...document, schemaVersion: 4, dockedLinkIds: [] }),
  4: (document) => ({ ...document, schemaVersion: 5, todos: [] }),
  5: (document) => ({ ...document, schemaVersion: 6, notes: [] }),
  6: (document) => ({ ...document, schemaVersion: 7, pinnedNoteId: null }),
  // Until v8 the layout was fixed; this is what it was.
  7: (document) => ({
    ...document,
    schemaVersion: 8,
    layout: [
      { widget: 'clock', size: 'M', column: 0, row: 0, visible: true },
      { widget: 'links', size: 'M', column: 0, row: 2, visible: true },
      { widget: 'todos', size: 'M', column: 8, row: 0, visible: true },
      { widget: 'notes', size: 'M', column: 8, row: 4, visible: true },
    ],
  }),
  // The Stage design: every Desktop moves to the Stage layout once. Hidden Widgets stay hidden.
  8: (document) => {
    const hidden = hiddenIn(document);
    const stage = [
      { widget: 'clock', size: 'L', column: 0, row: 0 },
      { widget: 'links', size: 'M', column: 0, row: 3 },
      { widget: 'todos', size: 'M', column: 4, row: 3 },
      { widget: 'notes', size: 'M', column: 8, row: 3 },
    ];
    return { ...document, schemaVersion: 9, layout: stage.map((entry) => ({ ...entry, visible: !hidden.has(entry.widget) })) };
  },
  // Weather and Calendar: every Desktop moves once to the Stage layout with its new top band
  // of Weather, Clock and Calendar. Hidden Widgets stay hidden; no city is chosen yet.
  9: (document) => {
    const hidden = hiddenIn(document);
    const stage = [
      { widget: 'weather', size: 'S', column: 0, row: 0 },
      { widget: 'clock', size: 'M', column: 3, row: 0 },
      { widget: 'calendar', size: 'S', column: 9, row: 0 },
      { widget: 'links', size: 'M', column: 0, row: 3 },
      { widget: 'todos', size: 'M', column: 4, row: 3 },
      { widget: 'notes', size: 'M', column: 8, row: 3 },
    ];
    return {
      ...document,
      schemaVersion: 10,
      layout: stage.map((entry) => ({ ...entry, visible: !hidden.has(entry.widget) })),
      weather: { city: null, report: null },
    };
  },
  // More Widgets: every Desktop moves once to the Stage layout with a fourth column beneath the
  // top band, holding the World Clock and a Countdown. Hidden Widgets stay hidden; the other new
  // Widgets start hidden, for Edit Mode to show.
  10: (document) => {
    const hidden = hiddenIn(document);
    const stage = [
      { widget: 'weather', size: 'S', column: 0, row: 0 },
      { widget: 'clock', size: 'M', column: 3, row: 0 },
      { widget: 'calendar', size: 'S', column: 9, row: 0 },
      { widget: 'links', size: 'M', column: 0, row: 3 },
      { widget: 'todos', size: 'M', column: 3, row: 3 },
      { widget: 'notes', size: 'M', column: 6, row: 3 },
      { widget: 'world-clock', size: 'S', column: 9, row: 3 },
      { widget: 'countdown', size: 'M', column: 9, row: 5 },
    ];
    const startHidden = [
      { widget: 'moon', size: 'S', column: 0, row: 0, visible: false },
      { widget: 'sun', size: 'S', column: 0, row: 0, visible: false },
      { widget: 'recent', size: 'M', column: 0, row: 0, visible: false },
      { widget: 'system', size: 'S', column: 0, row: 0, visible: false },
      { widget: 'github', size: 'S', column: 0, row: 0, visible: false },
    ];
    return {
      ...document,
      schemaVersion: 11,
      layout: [...stage.map((entry) => ({ ...entry, visible: !hidden.has(entry.widget) })), ...startHidden],
      countdowns: [],
      worldClocks: [],
      github: { token: '', contributions: null },
    };
  },
  // The wide Desktop: the grid spans the screen in 21 columns, room for every Widget at once.
  // Every Desktop moves once to the Stage layout for it. Of the Widgets webOS had before
  // version 11, hidden ones stay hidden; the newer ones are shown, as version 11 hid them
  // only for lack of room.
  11: (document) => {
    const hidden = hiddenIn(document);
    const older = new Set(['weather', 'clock', 'calendar', 'links', 'todos', 'notes']);
    const stage = [
      { widget: 'world-clock', size: 'M', column: 0, row: 0 },
      { widget: 'weather', size: 'S', column: 3, row: 0 },
      { widget: 'clock', size: 'M', column: 6, row: 0 },
      { widget: 'calendar', size: 'S', column: 12, row: 0 },
      { widget: 'sun', size: 'M', column: 15, row: 0 },
      { widget: 'moon', size: 'M', column: 18, row: 0 },
      { widget: 'links', size: 'M', column: 0, row: 3 },
      { widget: 'todos', size: 'M', column: 3, row: 3 },
      { widget: 'notes', size: 'M', column: 6, row: 3 },
      { widget: 'github', size: 'M', column: 9, row: 3 },
      { widget: 'recent', size: 'M', column: 18, row: 3 },
      { widget: 'countdown', size: 'S', column: 9, row: 6 },
      { widget: 'system', size: 'S', column: 12, row: 6 },
    ];
    return {
      ...document,
      schemaVersion: 12,
      layout: stage.map((entry) => ({ ...entry, visible: !(older.has(entry.widget) && hidden.has(entry.widget)) })),
    };
  },
};

/** The Widgets a document's saved layout has hidden. */
function hiddenIn(document: Record<string, unknown>): Set<unknown> {
  const saved = Array.isArray(document['layout']) ? document['layout'] : [];
  return new Set(saved.flatMap((entry) => (isRecord(entry) && entry['visible'] === false ? [entry['widget']] : [])));
}

/**
 * What each App remembers between openings, so it survives closing the App
 * and opening a new tab. Each App adds its own entry when it needs one.
 */
export interface AppMemory {
  notes?: {
    /** The Note the Notes App shows. It may since have been deleted. */
    selectedNoteId?: string;
  };
  'dev-utilities'?: {
    /** The tab the App shows. Checked when read, since it may come from another build. */
    activeTab?: string;
  };
}

export class StateDocumentError extends Error {
  override readonly name = 'StateDocumentError';
}

function freshDocument(): StateDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: { name: '' },
    apps: {},
    linkGroups: [],
    dockedLinkIds: [],
    todos: [],
    notes: [],
    pinnedNoteId: null,
    layout: [...defaultLayout],
    weather: { city: null, report: null },
    countdowns: [],
    worldClocks: [],
    github: { token: '', contributions: null },
  };
}

/** What a StateDocumentError calls the document by default: the one in storage. */
const STORED_STATE = 'The stored state';

function versionOf(document: unknown, subject: string): number {
  if (typeof document !== 'object' || document === null || Array.isArray(document)) {
    throw new StateDocumentError(`${subject} is not a webOS state document.`);
  }
  const version = (document as { schemaVersion?: unknown }).schemaVersion;
  if (version === undefined) return 0;
  if (!Number.isInteger(version) || (version as number) < 0) {
    throw new StateDocumentError(`${subject} has an invalid schema version: ${String(version)}.`);
  }
  if ((version as number) > SCHEMA_VERSION) {
    throw new StateDocumentError(
      `${subject} comes from a newer webOS (schema version ${version}, this build knows ${SCHEMA_VERSION}).`,
    );
  }
  return version as number;
}

/** Throws unless `document` has the current schema's shape. */
function assertCurrentShape(
  document: Record<string, unknown>,
  subject: string,
): asserts document is Record<string, unknown> & StateDocument {
  const profile = document['profile'] as { name?: unknown } | undefined;
  const apps = document['apps'];
  const weather = document['weather'] as { city?: unknown; report?: unknown } | undefined;
  const github = document['github'] as { token?: unknown; contributions?: unknown } | undefined;
  if (
    typeof profile?.name !== 'string' ||
    typeof apps !== 'object' ||
    apps === null ||
    Array.isArray(apps) ||
    !Array.isArray(document['linkGroups']) ||
    !Array.isArray(document['dockedLinkIds']) ||
    !Array.isArray(document['todos']) ||
    !Array.isArray(document['notes']) ||
    (typeof document['pinnedNoteId'] !== 'string' && document['pinnedNoteId'] !== null) ||
    !Array.isArray(document['layout']) ||
    !isRecord(weather) ||
    !(weather.city === null || isRecord(weather.city)) ||
    !(weather.report === null || isRecord(weather.report)) ||
    !Array.isArray(document['countdowns']) ||
    !Array.isArray(document['worldClocks']) ||
    !isRecord(github) ||
    typeof github.token !== 'string' ||
    !(github.contributions === null || isRecord(github.contributions))
  ) {
    throw new StateDocumentError(`${subject} is damaged: part of it is missing.`);
  }
}

/**
 * Brings any older document forward to the current schema version, one step
 * at a time, and checks the result. Throws a `StateDocumentError` if the
 * document can't be used, calling it `subject` ("The stored state" by default).
 */
export function toCurrentDocument(document: unknown, subject = STORED_STATE): StateDocument {
  let version = versionOf(document, subject);
  let current = document as Record<string, unknown>;
  while (version < SCHEMA_VERSION) {
    current = migrations[version](current);
    version++;
  }
  assertCurrentShape(current, subject);
  return current;
}

/**
 * Reads the document from storage, migrating it if needed. Throws without
 * writing if the stored document can't be used, so it is never overwritten.
 */
export async function loadState(storage: Storage): Promise<StateDocument> {
  const stored = await storage.read();
  if (stored === undefined) {
    const document = freshDocument();
    await storage.write(document);
    return document;
  }
  const document = toCurrentDocument(stored);
  if (document !== stored) await storage.write(document);
  return document;
}


const isCity = (city: unknown) =>
  isRecord(city) &&
  isText(city['name']) &&
  isText(city['region']) &&
  isText(city['country']) &&
  isFiniteNumber(city['latitude']) &&
  isFiniteNumber(city['longitude']);

/** Whether `list` holds only objects that each pass `check`, with no two sharing an id. */
function allRecords(list: unknown, check: (item: Record<string, unknown>) => boolean): list is Record<string, unknown>[] {
  if (!Array.isArray(list) || !list.every((item) => isRecord(item) && isText(item['id']) && check(item))) return false;
  return new Set(list.map((item) => item['id'])).size === list.length;
}

/**
 * Throws unless every Link Group, Link, Docked Link, Todo, Note, Countdown and World Clock city in a
 * current-shape document has the fields webOS reads, and no two of a kind share
 * an id. Checked for documents from outside, such as a backup file; the layout
 * needs no check, as it is made safe whenever it is read.
 */
export function assertValidContents(document: StateDocument, subject: string): void {
  const valid =
    allRecords(document.linkGroups, (group) => isText(group['name']) && Array.isArray(group['links'])) &&
    // Link ids are unique across all Link Groups, as the Dock refers to them by id alone.
    allRecords(
      document.linkGroups.flatMap((group) => group.links),
      (link) => isText(link['title']) && isText(link['url']),
    ) &&
    document.dockedLinkIds.every(isText) &&
    allRecords(
      document.todos,
      (todo) => isText(todo['text']) && isFiniteNumber(todo['createdAt']) && (todo['completedAt'] === null || isFiniteNumber(todo['completedAt'])),
    ) &&
    allRecords(document.notes, (note) => isText(note['body']) && isFiniteNumber(note['createdAt']) && isFiniteNumber(note['editedAt'])) &&
    (document.weather.city === null || isCity(document.weather.city)) &&
    allRecords(document.countdowns, (countdown) => isText(countdown['title']) && isText(countdown['date'])) &&
    allRecords(
      document.worldClocks,
      (city) => isText(city['name']) && isText(city['country']) && isText(city['timeZone']),
    );
  if (!valid) throw new StateDocumentError(`${subject} is damaged: some of its data isn't what webOS expects.`);
}
