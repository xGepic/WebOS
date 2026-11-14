import { defaultLayout, type LayoutEntry } from '../desktop/desktop';
import type { Clip } from '../clipboard/clips';
import type { Storage } from '../edges';
import { isFiniteNumber, isRecord, isText } from '../guards';
import type { Note } from '../organizer/notes';
import { NO_APPLE_CALENDAR, type AppleCalendarState } from '../time/apple-calendar';
import type { Countdown } from '../time/countdown';
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
  /** Every Todo, open and completed, in display order. */
  todos: Todo[];
  /** Every Note, in the order they were created. */
  notes: Note[];
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
  /** The Clipboard App's Clips, newest first. */
  clips: Clip[];
  /** Apple Calendar: the account, its calendars and the last sync. Backups leave it out: it holds a password. */
  appleCalendar: AppleCalendarState;
  systemWidget: {
    /** The parts of the System Widget the user hid. What is hidden is stored, so parts added later are shown. */
    hidden: string[];
  };
}

const SCHEMA_VERSION = 22;

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
  // The centred Clock: the Clock at size M grows from six columns to seven, so it can sit in the
  // exact middle of the 21. A Desktop whose top band is still version 12's Stage moves to the new
  // one: the Clock centred with a gap either side, Calendar and Sun after it, and the Moon, which no
  // longer fits up there, small in the slot under GitHub. Visibility is kept. Any other layout is
  // the user's own and stays as it is; loading it moves whatever the wider Clock now covers.
  12: (document) => {
    const saved = Array.isArray(document['layout']) ? document['layout'] : [];
    const oldBand: Record<string, string> = {
      'world-clock': 'M@0,0',
      weather: 'S@3,0',
      clock: 'M@6,0',
      calendar: 'S@12,0',
      sun: 'M@15,0',
      moon: 'M@18,0',
    };
    const newBand: Record<string, { size: string; column: number; row: number }> = {
      clock: { size: 'M', column: 7, row: 0 },
      calendar: { size: 'S', column: 15, row: 0 },
      sun: { size: 'M', column: 18, row: 0 },
      moon: { size: 'S', column: 15, row: 6 },
    };
    const where = (entry: unknown) => (isRecord(entry) ? `${entry['size']}@${entry['column']},${entry['row']}` : '');
    const onOldBand = Object.entries(oldBand).every(([widget, place]) =>
      saved.some((entry) => isRecord(entry) && entry['widget'] === widget && where(entry) === place),
    );
    const layout = onOldBand
      ? saved.map((entry) => (isRecord(entry) && typeof entry['widget'] === 'string' && newBand[entry['widget']] ? { ...entry, ...newBand[entry['widget']] } : entry))
      : saved;
    return { ...document, schemaVersion: 13, layout };
  },
  // The Search Widget: the Clock at size M is two rows high instead of three, and the Search
  // Widget, one row high and as wide, takes the row it frees, wherever the Clock is. With the
  // Clock hidden or at another size, the Search Widget starts hidden, for Edit Mode to show.
  13: (document) => {
    const saved = Array.isArray(document['layout']) ? document['layout'] : [];
    const clock = saved.find((entry) => isRecord(entry) && entry['widget'] === 'clock');
    const under =
      isRecord(clock) && clock['visible'] === true && clock['size'] === 'M' && isFiniteNumber(clock['column']) && isFiniteNumber(clock['row'])
        ? { column: clock['column'], row: clock['row'] + 2, visible: true }
        : { column: 0, row: 0, visible: false };
    return { ...document, schemaVersion: 14, layout: [...saved, { widget: 'search', size: 'M', ...under }] };
  },
  // No more GitHub Widget: the token and the stored contribution graph go. The layout's GitHub
  // entry is dropped when the layout is loaded, as for any Widget webOS no longer has.
  14: ({ github: _, ...document }) => ({ ...document, schemaVersion: 15 }),
  // No more Links: with the Links Widget, the Launcher and Docked Links gone, nothing shows
  // them, so the Link Groups and the Dock's list of Links go.
  15: ({ linkGroups: _, dockedLinkIds: __, ...document }) => ({ ...document, schemaVersion: 16 }),
  // The Clipboard App: no Clips yet.
  16: (document) => ({ ...document, schemaVersion: 17, clips: [] }),
  // A pre-release build of the Calendar marks saved a holiday country as version 18. webOS marks
  // Austria's holidays without one, so version 19 drops it. Version 17 documents have none to drop.
  17: (document) => ({ ...document, schemaVersion: 18 }),
  18: ({ calendar: _, ...document }) => ({ ...document, schemaVersion: 19 }),
  // Apple Calendar: not connected.
  19: (document) => ({ ...document, schemaVersion: 20, appleCalendar: { account: null, calendars: [], sync: null } }),
  // System details: every part of the System Widget shown.
  20: (document) => ({ ...document, schemaVersion: 21, systemWidget: { hidden: [] } }),
  // Notes in the Dock: with the Notes Widget gone, nothing shows the Pinned Note, so it goes.
  // The layout's Notes entry is dropped when the layout is loaded, as for any Widget webOS no longer has.
  21: ({ pinnedNoteId: _, ...document }) => ({ ...document, schemaVersion: 22 }),
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
interface AppMemory {
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
    todos: [],
    notes: [],
    layout: [...defaultLayout],
    weather: { city: null, report: null },
    countdowns: [],
    worldClocks: [],
    clips: [],
    appleCalendar: NO_APPLE_CALENDAR,
    systemWidget: { hidden: [] },
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
  const apple = document['appleCalendar'];
  const systemWidget = document['systemWidget'];
  if (
    typeof profile?.name !== 'string' ||
    typeof apps !== 'object' ||
    apps === null ||
    Array.isArray(apps) ||
    !Array.isArray(document['todos']) ||
    !Array.isArray(document['notes']) ||
    !Array.isArray(document['layout']) ||
    !isRecord(weather) ||
    !(weather.city === null || isRecord(weather.city)) ||
    !(weather.report === null || isRecord(weather.report)) ||
    !Array.isArray(document['countdowns']) ||
    !Array.isArray(document['worldClocks']) ||
    !Array.isArray(document['clips']) ||
    !isRecord(apple) ||
    !(apple['account'] === null || isRecord(apple['account'])) ||
    !Array.isArray(apple['calendars']) ||
    !(apple['sync'] === null || isRecord(apple['sync'])) ||
    !isRecord(systemWidget) ||
    !Array.isArray(systemWidget['hidden'])
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
 * Throws unless every Todo, Note, Countdown, World Clock city and Clip in a
 * current-shape document has the fields webOS reads, and no two of a kind share
 * an id. Checked for documents from outside, such as a backup file; the layout
 * needs no check, as it is made safe whenever it is read.
 */
export function assertValidContents(document: StateDocument, subject: string): void {
  const valid =
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
    ) &&
    allRecords(document.clips, (clip) => isText(clip['text']) && isFiniteNumber(clip['savedAt']) && typeof clip['pinned'] === 'boolean');
  if (!valid) throw new StateDocumentError(`${subject} is damaged: some of its data isn't what webOS expects.`);
}
