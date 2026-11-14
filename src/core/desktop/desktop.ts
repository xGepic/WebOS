/**
 * The Desktop's snap grid, in cells. Widgets are placed and sized in whole
 * cells. It spans the screen's full width, and is wide enough for every Widget
 * at once: 21 columns is seven Widgets three columns wide side by side.
 */
export const grid = { columns: 21, rows: 8 } as const;

export type WidgetSize = 'S' | 'M' | 'L';

/** How many grid cells a Widget covers. */
export interface Span {
  columns: number;
  rows: number;
}

export interface WidgetDefinition {
  name: string;
  sizes: Record<WidgetSize, Span>;
}

/** Every Widget webOS has. At most one of each is on the Desktop. */
export const widgets = {
  clock: {
    name: 'Clock',
    sizes: {
      S: { columns: 3, rows: 2 },
      // The middle of the Stage layout's top band, between Weather and Calendar, above the Search
      // Widget. Seven columns, an odd number like the grid's 21, so it can sit exactly in the
      // middle: columns 7 to 13.
      M: { columns: 7, rows: 2 },
      // A wide band across the Desktop.
      L: { columns: 12, rows: 3 },
    },
  },
  todos: {
    name: 'Todos',
    sizes: {
      S: { columns: 3, rows: 3 },
      M: { columns: 3, rows: 5 },
      L: { columns: 4, rows: 6 },
    },
  },
  notes: {
    name: 'Notes',
    sizes: {
      S: { columns: 3, rows: 3 },
      M: { columns: 3, rows: 5 },
      L: { columns: 6, rows: 5 },
    },
  },
  weather: {
    name: 'Weather',
    sizes: {
      S: { columns: 3, rows: 3 },
      M: { columns: 4, rows: 4 },
      L: { columns: 6, rows: 4 },
    },
  },
  calendar: {
    name: 'Calendar',
    sizes: {
      S: { columns: 3, rows: 3 },
      M: { columns: 4, rows: 4 },
      L: { columns: 4, rows: 5 },
    },
  },
  'world-clock': {
    name: 'World Clock',
    sizes: {
      S: { columns: 3, rows: 2 },
      M: { columns: 3, rows: 3 },
      L: { columns: 6, rows: 2 },
    },
  },
  countdown: {
    name: 'Countdown',
    sizes: {
      S: { columns: 3, rows: 2 },
      M: { columns: 3, rows: 3 },
      L: { columns: 6, rows: 3 },
    },
  },
  moon: {
    name: 'Moon',
    sizes: {
      S: { columns: 3, rows: 2 },
      M: { columns: 3, rows: 3 },
      L: { columns: 4, rows: 4 },
    },
  },
  sun: {
    name: 'Sun',
    sizes: {
      S: { columns: 3, rows: 2 },
      M: { columns: 3, rows: 3 },
      L: { columns: 6, rows: 3 },
    },
  },
  recent: {
    name: 'Recent',
    sizes: {
      S: { columns: 3, rows: 3 },
      M: { columns: 3, rows: 5 },
      L: { columns: 6, rows: 5 },
    },
  },
  system: {
    name: 'System',
    sizes: {
      S: { columns: 3, rows: 2 },
      M: { columns: 3, rows: 3 },
      L: { columns: 6, rows: 3 },
    },
  },
  // One day in full: today, or the day picked in the Calendar. Tall, like Todos, for a full day's list.
  today: {
    name: 'Today',
    sizes: {
      S: { columns: 3, rows: 3 },
      M: { columns: 3, rows: 5 },
      L: { columns: 4, rows: 6 },
    },
  },
  // A search field, one row high: Enter searches DuckDuckGo. M matches the Clock's width, to sit under it.
  search: {
    name: 'Search',
    sizes: {
      S: { columns: 3, rows: 1 },
      M: { columns: 7, rows: 1 },
      L: { columns: 12, rows: 1 },
    },
  },
} as const satisfies Record<string, WidgetDefinition>;

export type WidgetId = keyof typeof widgets;

/** A cell on the grid, 0-based from the top left. */
export interface Cell {
  column: number;
  row: number;
}

/** Where a Widget sits: its size and its top-left cell. */
export interface Placement extends Cell {
  widget: WidgetId;
  size: WidgetSize;
}

/** A Widget on the Desktop, with the cells its size spans. */
export interface PlacedWidget extends Placement, Span {}

/** One Widget's entry in the saved layout. Hidden Widgets keep their place and size for when they are shown again. */
export interface LayoutEntry extends Placement {
  visible: boolean;
}

/**
 * Where each Widget sits on a fresh Desktop: the Stage layout. A top band of
 * the World Clock, Weather, the Clock with the Search Widget under it,
 * Calendar and Sun, with the Clock and Search in the exact middle and a
 * one-column gap on either side of them; beneath it Today, then Todos, Notes,
 * a Countdown, System and Moon side by side along the bottom, and Recent.
 * Every Widget is visible, and the 9 × 3 space above the Countdown, System and
 * Moon is free, so Edit Mode has room to move things.
 */
export const defaultLayout: readonly LayoutEntry[] = [
  { widget: 'world-clock', size: 'M', column: 0, row: 0, visible: true },
  { widget: 'weather', size: 'S', column: 3, row: 0, visible: true },
  { widget: 'clock', size: 'M', column: 7, row: 0, visible: true },
  { widget: 'search', size: 'M', column: 7, row: 2, visible: true },
  { widget: 'calendar', size: 'S', column: 15, row: 0, visible: true },
  { widget: 'sun', size: 'M', column: 18, row: 0, visible: true },
  { widget: 'today', size: 'M', column: 0, row: 3, visible: true },
  { widget: 'todos', size: 'M', column: 3, row: 3, visible: true },
  { widget: 'notes', size: 'M', column: 6, row: 3, visible: true },
  { widget: 'recent', size: 'M', column: 18, row: 3, visible: true },
  { widget: 'countdown', size: 'S', column: 9, row: 6, visible: true },
  { widget: 'system', size: 'S', column: 12, row: 6, visible: true },
  { widget: 'moon', size: 'S', column: 15, row: 6, visible: true },
];

/** The sizes, largest first: a Widget that has to shrink tries them in this order. */
const LARGEST_FIRST: readonly WidgetSize[] = ['L', 'M', 'S'];

/** A rectangle of cells. */
interface Box extends Cell, Span {}

const spanOf = ({ widget, size }: Pick<Placement, 'widget' | 'size'>): Span => widgets[widget].sizes[size];
const boxOf = (placement: Placement): Box => ({ column: placement.column, row: placement.row, ...spanOf(placement) });
/** Top to bottom, then left to right. */
const readingOrder = (a: Cell, b: Cell) => a.row - b.row || a.column - b.column;
/** The entries with `widget`'s replaced. */
const replace = (entries: readonly LayoutEntry[], replacement: LayoutEntry) =>
  entries.map((entry) => (entry.widget === replacement.widget ? replacement : entry));
const entryOf = (entries: readonly LayoutEntry[], widget: WidgetId) => entries.find((entry) => entry.widget === widget);

const overlaps = (a: Box, b: Box) =>
  a.column < b.column + b.columns && b.column < a.column + a.columns && a.row < b.row + b.rows && b.row < a.row + a.rows;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

/** The placement moved, if need be, so that all of it is on the grid. */
function onGrid<T extends Placement>(placement: T): T {
  const span = spanOf(placement);
  return {
    ...placement,
    column: clamp(placement.column, 0, grid.columns - span.columns),
    row: clamp(placement.row, 0, grid.rows - span.rows),
  };
}

/**
 * The next position, in reading order from `start` and wrapping round to the
 * top, where a Widget of `span` covers none of `occupied`.
 */
function nextFreePosition(span: Span, start: Cell, occupied: readonly Box[]): Cell | undefined {
  const positions: Cell[] = [];
  for (let row = 0; row + span.rows <= grid.rows; row++) {
    for (let column = 0; column + span.columns <= grid.columns; column++) positions.push({ column, row });
  }
  const first = Math.max(
    0,
    positions.findIndex((p) => p.row > start.row || (p.row === start.row && p.column >= start.column)),
  );
  for (let i = 0; i < positions.length; i++) {
    const position = positions[(first + i) % positions.length];
    if (!occupied.some((box) => overlaps({ ...position, ...span }, box))) return position;
  }
  return undefined;
}

/** The Widget at the next free position from where it is, at its own size; undefined if there is no room. */
function findRoom(entry: LayoutEntry, occupied: readonly Box[]): LayoutEntry | undefined {
  const position = nextFreePosition(spanOf(entry), entry, occupied);
  return position && { ...entry, ...position, visible: true };
}

/**
 * Like `findRoom`, but a Widget with no room at its size takes a smaller one,
 * and with no room at any size is hidden. Only for repairing a stored layout:
 * the user's own changes never resize or hide other Widgets.
 */
function forceRoom(entry: LayoutEntry, occupied: readonly Box[]): LayoutEntry {
  for (const size of LARGEST_FIRST.slice(LARGEST_FIRST.indexOf(entry.size))) {
    const room = findRoom({ ...entry, size }, occupied);
    if (room) return room;
  }
  return { ...entry, visible: false };
}

/**
 * Puts `fixed` where it is, and the others around it: those it doesn't touch
 * stay; those it covers move, in reading order, to the next free position.
 * Undefined if one of them has no room anywhere.
 */
function settleAround(entries: readonly LayoutEntry[], fixed: LayoutEntry): LayoutEntry[] | undefined {
  const fixedBox = boxOf(fixed);
  const occupied: Box[] = [fixedBox];
  const others = entries.filter((entry) => entry.widget !== fixed.widget);
  const displaced = others.filter((entry) => entry.visible && overlaps(boxOf(entry), fixedBox));
  others.filter((entry) => entry.visible && !displaced.includes(entry)).forEach((entry) => occupied.push(boxOf(entry)));

  const moved = new Map<WidgetId, LayoutEntry>();
  for (const entry of [...displaced].sort(readingOrder)) {
    const placed = findRoom(entry, occupied);
    if (!placed) return undefined;
    occupied.push(boxOf(placed));
    moved.set(entry.widget, placed);
  }
  return entries.map((entry) => (entry.widget === fixed.widget ? fixed : (moved.get(entry.widget) ?? entry)));
}

/** The visible Widgets with the cells they span, in reading order (top to bottom, then left to right). */
export function placedWidgets(entries: readonly LayoutEntry[]): PlacedWidget[] {
  return entries
    .filter((entry) => entry.visible)
    .map(({ visible: _, ...placement }) => ({ ...placement, ...spanOf(placement) }))
    .sort(readingOrder);
}

/** Where a Widget of `size` with its top-left at `cell` would sit: the nearest cell that keeps all of it on the grid. */
export function fitOnGrid(widget: WidgetId, size: WidgetSize, cell: Cell): Cell {
  const { column, row } = onGrid({ widget, size, ...cell });
  return { column, row };
}

/** The hidden Widgets, in catalog order. */
export function hiddenWidgets(entries: readonly LayoutEntry[]): WidgetId[] {
  const hidden = new Set(entries.filter((entry) => !entry.visible).map((entry) => entry.widget));
  return (Object.keys(widgets) as WidgetId[]).filter((widget) => hidden.has(widget));
}

/**
 * Moves a visible Widget so its top-left cell is `column`, `row` (kept on the
 * grid), pushing aside what it lands on. Undefined if the move is refused:
 * a Widget it would push has no room anywhere.
 */
export function moveWidget(entries: readonly LayoutEntry[], widget: WidgetId, column: number, row: number): LayoutEntry[] | undefined {
  const entry = entryOf(entries, widget);
  if (!entry?.visible) return undefined;
  return settleAround(entries, onGrid({ ...entry, column, row }));
}

/**
 * Resizes a Widget, keeping it on the grid and pushing aside what it grows
 * over. A hidden Widget just keeps the new size. Undefined if refused, as for
 * `moveWidget`.
 */
export function resizeWidget(entries: readonly LayoutEntry[], widget: WidgetId, size: WidgetSize): LayoutEntry[] | undefined {
  const entry = entryOf(entries, widget);
  if (!entry) return undefined;
  const resized = onGrid({ ...entry, size });
  return entry.visible ? settleAround(entries, resized) : replace(entries, resized);
}

export function hideWidget(entries: readonly LayoutEntry[], widget: WidgetId): LayoutEntry[] {
  const entry = entryOf(entries, widget);
  return entry ? replace(entries, { ...entry, visible: false }) : [...entries];
}

/**
 * Shows a hidden Widget where it was, or at the next free position from there.
 * It doesn't push anything aside. Undefined if there is no room for it at its size.
 */
export function showWidget(entries: readonly LayoutEntry[], widget: WidgetId): LayoutEntry[] | undefined {
  const entry = entryOf(entries, widget);
  if (!entry) return undefined;
  if (entry.visible) return [...entries];
  const room = findRoom(onGrid(entry), entries.filter((other) => other.visible).map(boxOf));
  return room && replace(entries, room);
}

const isEntry = (value: unknown): value is LayoutEntry => {
  const entry = value as Partial<LayoutEntry> | null;
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof entry.widget === 'string' &&
    Object.hasOwn(widgets, entry.widget) &&
    LARGEST_FIRST.includes(entry.size as WidgetSize) &&
    Number.isFinite(entry.column) &&
    Number.isFinite(entry.row) &&
    typeof entry.visible === 'boolean'
  );
};

/**
 * A saved layout made safe to use, whatever wrote it: unknown and repeated
 * entries are dropped (each Widget appears once), Widgets it doesn't mention
 * are added hidden, and visible Widgets are kept on the grid without overlaps.
 */
export function normalizeLayout(saved: readonly unknown[]): LayoutEntry[] {
  const seen = new Set<WidgetId>();
  const entries = saved.filter(isEntry).filter((entry) => !seen.has(entry.widget) && seen.add(entry.widget));
  for (const widget of Object.keys(widgets) as WidgetId[]) {
    if (!seen.has(widget)) entries.push({ widget, size: 'M', column: 0, row: 0, visible: false });
  }
  const occupied: Box[] = [];
  return entries.map((entry) => {
    if (!entry.visible) return onGrid(entry);
    const placed = onGrid(entry);
    const settled = occupied.some((box) => overlaps(boxOf(placed), box)) ? forceRoom(placed, occupied) : placed;
    if (settled.visible) occupied.push(boxOf(settled));
    return settled;
  });
}
