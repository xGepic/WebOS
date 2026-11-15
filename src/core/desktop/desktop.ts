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
  // One day in full: today, or the day picked in the Calendar. The Calendar's size at each size, so
  // the two line up as the pair they are.
  today: {
    name: 'Today',
    sizes: {
      S: { columns: 3, rows: 3 },
      M: { columns: 4, rows: 4 },
      L: { columns: 4, rows: 5 },
    },
  },
  // The sites visited most, as tiles. M matches the Clock's width, to sit under the Search Widget.
  'top-sites': {
    name: 'Top Sites',
    sizes: {
      S: { columns: 3, rows: 2 },
      M: { columns: 7, rows: 2 },
      L: { columns: 12, rows: 2 },
    },
  },
  // The new tabs opened today, over a bar for each of the last seven days. The Countdown's sizes.
  'new-tabs': {
    name: 'New Tabs',
    sizes: {
      S: { columns: 3, rows: 2 },
      M: { columns: 3, rows: 3 },
      L: { columns: 6, rows: 3 },
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
export interface PlacedWidget extends Placement, Span {
  /** For a stack: its Widgets in order, `widget` first. Absent for a Widget on its own. */
  stack?: readonly WidgetId[];
  /** For a stack: the Widget it shows. */
  shown?: WidgetId;
}

/**
 * One Widget's entry in the saved layout. Hidden Widgets keep their place and
 * size for when they are shown again.
 *
 * A stack is the entry of the visible Widget at its place, with the Widgets
 * stacked with it in `stacked`. Their own entries aren't visible, and a stacked
 * Widget isn't one of the hidden ones either.
 */
export interface LayoutEntry extends Placement {
  visible: boolean;
  /** The Widgets stacked with this one, in order, after it. Absent when there are none. */
  stacked?: WidgetId[];
  /** The Widget a stack shows; this one when absent. */
  shown?: WidgetId;
}

/**
 * Where each Widget sits on a fresh Desktop: the Stage layout. A top band of
 * the World Clock, Weather, the Clock with the Search Widget under it,
 * Calendar and Sun, with the Clock and Search in the exact middle and a
 * one-column gap on either side of them; Top Sites under the Search Widget;
 * beneath it Today and Todos, then a Countdown, System and Moon side by side
 * along the bottom, and Recent with New Tabs beside it. Every Widget is
 * visible. The space beside Todos and either side of Top Sites is free, so
 * Edit Mode has room to move things.
 */
export const defaultLayout: readonly LayoutEntry[] = [
  { widget: 'world-clock', size: 'M', column: 0, row: 0, visible: true },
  { widget: 'weather', size: 'S', column: 3, row: 0, visible: true },
  { widget: 'clock', size: 'M', column: 7, row: 0, visible: true },
  { widget: 'search', size: 'M', column: 7, row: 2, visible: true },
  { widget: 'top-sites', size: 'M', column: 7, row: 3, visible: true },
  { widget: 'calendar', size: 'S', column: 15, row: 0, visible: true },
  { widget: 'sun', size: 'M', column: 18, row: 0, visible: true },
  { widget: 'today', size: 'M', column: 0, row: 3, visible: true },
  { widget: 'todos', size: 'M', column: 4, row: 3, visible: true },
  { widget: 'recent', size: 'M', column: 18, row: 3, visible: true },
  { widget: 'new-tabs', size: 'S', column: 15, row: 3, visible: true },
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

/** The entry of the stack holding `widget`, or `widget`'s own entry if it isn't stacked. */
const headOf = (entries: readonly LayoutEntry[], widget: WidgetId) =>
  entries.find((entry) => entry.stacked?.includes(widget)) ?? entryOf(entries, widget);
const isStacked = (entries: readonly LayoutEntry[], widget: WidgetId) => entries.some((entry) => entry.stacked?.includes(widget));
/** The entry on its own: no stack. */
const alone = ({ stacked: _, shown: __, ...entry }: LayoutEntry): LayoutEntry => entry;
const sameSpan = (a: Span, b: Span) => a.columns === b.columns && a.rows === b.rows;
/** Whether `widget` covers the same cells as `head` does at `head`'s size, so it can be in its stack. */
const fitsStack = (head: Placement, widget: WidgetId) => sameSpan(spanOf({ widget, size: head.size }), spanOf(head));

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
    .map(({ visible: _, stacked, shown, ...placement }) => ({
      ...placement,
      ...spanOf(placement),
      ...(stacked?.length ? { stack: [placement.widget, ...stacked], shown: shown && stacked.includes(shown) ? shown : placement.widget } : {}),
    }))
    .sort(readingOrder);
}

/** Where a Widget of `size` with its top-left at `cell` would sit: the nearest cell that keeps all of it on the grid. */
export function fitOnGrid(widget: WidgetId, size: WidgetSize, cell: Cell): Cell {
  const { column, row } = onGrid({ widget, size, ...cell });
  return { column, row };
}

/** The hidden Widgets, in catalog order. */
export function hiddenWidgets(entries: readonly LayoutEntry[]): WidgetId[] {
  const hidden = new Set(entries.filter((entry) => !entry.visible && !isStacked(entries, entry.widget)).map((entry) => entry.widget));
  return (Object.keys(widgets) as WidgetId[]).filter((widget) => hidden.has(widget));
}

/**
 * Moves a visible Widget so its top-left cell is `column`, `row` (kept on the
 * grid), pushing aside what it lands on. Undefined if the move is refused:
 * a Widget it would push has no room anywhere.
 */
export function moveWidget(entries: readonly LayoutEntry[], widget: WidgetId, column: number, row: number): LayoutEntry[] | undefined {
  const entry = headOf(entries, widget);
  if (!entry?.visible) return undefined;
  return settleAround(entries, onGrid({ ...entry, column, row }));
}

/**
 * Resizes a Widget, keeping it on the grid and pushing aside what it grows
 * over. A hidden Widget just keeps the new size. A stacked Widget resizes its
 * stack, and only to a size at which all its Widgets cover the same cells.
 * Undefined if refused, as for `moveWidget`, or for such a size.
 */
export function resizeWidget(entries: readonly LayoutEntry[], widget: WidgetId, size: WidgetSize): LayoutEntry[] | undefined {
  const entry = headOf(entries, widget);
  if (!entry) return undefined;
  if (entry.stacked?.some((member) => !fitsStack({ ...entry, size }, member))) return undefined;
  const resized = onGrid({ ...entry, size });
  return entry.visible ? settleAround(entries, resized) : replace(entries, resized);
}

/** Hides a Widget. A stacked one leaves its stack, and the rest of the stack stays. */
export function hideWidget(entries: readonly LayoutEntry[], widget: WidgetId): LayoutEntry[] {
  if (headOf(entries, widget)?.stacked?.length) return leaveStack(entries, widget);
  const entry = entryOf(entries, widget);
  return entry ? replace(entries, { ...entry, visible: false }) : [...entries];
}

/**
 * Shows a hidden Widget at size S, whatever size it had, where it was or at the
 * next free position from there; Edit Mode can make it bigger. It doesn't push
 * anything aside. Undefined if there is no room for it at size S.
 */
export function showWidget(entries: readonly LayoutEntry[], widget: WidgetId): LayoutEntry[] | undefined {
  const entry = entryOf(entries, widget);
  if (!entry || isStacked(entries, widget)) return undefined;
  if (entry.visible) return [...entries];
  const room = findRoom(onGrid({ ...entry, size: 'S' }), entries.filter((other) => other.visible).map(boxOf));
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
 * Where two overlap, as when a newer build makes a size bigger, the one first
 * in reading order keeps its place and the other moves on, whatever order they
 * are stored in. The entries keep their stored order.
 */
export function normalizeLayout(saved: readonly unknown[]): LayoutEntry[] {
  const seen = new Set<WidgetId>();
  const entries = saved.filter(isEntry).filter((entry) => !seen.has(entry.widget) && seen.add(entry.widget));
  for (const widget of Object.keys(widgets) as WidgetId[]) {
    if (!seen.has(widget)) entries.push({ widget, size: 'M', column: 0, row: 0, visible: false });
  }
  const onTheGrid = safeStacks(entries).map((entry) => onGrid(entry));
  const occupied: Box[] = [];
  const settled = new Map<WidgetId, LayoutEntry>();
  for (const placed of onTheGrid.filter((entry) => entry.visible).sort(readingOrder)) {
    const entry = occupied.some((box) => overlaps(boxOf(placed), box)) ? forceRoom(placed, occupied) : placed;
    if (entry.visible) occupied.push(boxOf(entry));
    settled.set(entry.widget, entry);
  }
  return safeStacks(onTheGrid.map((entry) => settled.get(entry.widget) ?? entry));
}

/**
 * Stacks `widget`, with any Widgets stacked with it, onto `onto`'s place,
 * showing what `widget` showed. Undefined if refused: either isn't on the
 * Desktop, they are the same stack, or one of them doesn't cover the same
 * cells as `onto` at its size.
 */
export function stackWidget(entries: readonly LayoutEntry[], widget: WidgetId, onto: WidgetId): LayoutEntry[] | undefined {
  const target = headOf(entries, onto);
  const source = headOf(entries, widget);
  if (!target?.visible || !source?.visible || target.widget === source.widget) return undefined;
  const incoming = [source.widget, ...(source.stacked ?? [])];
  if (!incoming.every((member) => fitsStack(target, member))) return undefined;
  const stack: LayoutEntry = { ...target, stacked: [...(target.stacked ?? []), ...incoming], shown: source.shown ?? source.widget };
  // The stacked Widgets keep the stack's size and place, for when they leave it.
  const stacked = (entry: LayoutEntry): LayoutEntry => ({ ...alone(entry), size: target.size, column: target.column, row: target.row, visible: false });
  return entries.map((entry) => (entry.widget === target.widget ? stack : incoming.includes(entry.widget) ? stacked(entry) : entry));
}

/**
 * Takes `widget` out of its stack to the next free position from the stack,
 * at the stack's size. Undefined if it isn't in a stack, or there is no room.
 */
export function unstackWidget(entries: readonly LayoutEntry[], widget: WidgetId): LayoutEntry[] | undefined {
  if (!headOf(entries, widget)?.stacked?.length) return undefined;
  const left = leaveStack(entries, widget);
  const entry = entryOf(left, widget)!;
  const room = findRoom(entry, left.filter((other) => other.visible).map(boxOf));
  return room && replace(left, room);
}

/** Shows `widget` in its stack. Undefined if it isn't in a stack. */
export function showInStack(entries: readonly LayoutEntry[], widget: WidgetId): LayoutEntry[] | undefined {
  const head = headOf(entries, widget);
  if (!head?.stacked?.length) return undefined;
  return replace(entries, { ...head, shown: widget });
}

/**
 * The layout with `widget` out of its stack and hidden, at the stack's size
 * and place. If it was the Widget at the stack's place, the next one takes it.
 * A stack left with one Widget is that Widget on its own. If it was the one
 * shown, the one after it shows, or the last.
 */
function leaveStack(entries: readonly LayoutEntry[], widget: WidgetId): LayoutEntry[] {
  const head = headOf(entries, widget)!;
  const members = [head.widget, ...(head.stacked ?? [])];
  const remaining = members.filter((member) => member !== widget);
  const shown = head.shown ?? head.widget;
  const nextShown = shown !== widget ? shown : remaining[Math.min(members.indexOf(widget), remaining.length - 1)];
  const [first, ...rest] = remaining;
  const place = { size: head.size, column: head.column, row: head.row };
  const newHead: LayoutEntry = {
    ...alone(entryOf(entries, first)!),
    ...place,
    visible: true,
    ...(rest.length ? { stacked: rest, shown: nextShown } : {}),
  };
  const left: LayoutEntry = { ...alone(entryOf(entries, widget)!), ...place, visible: false };
  return entries.map((entry) => (entry.widget === first ? newHead : entry.widget === widget ? left : entry));
}

/**
 * The entries with every stack made safe, whatever wrote them: only a visible
 * Widget heads a stack, and it holds only known Widgets that aren't on the
 * Desktop, aren't in another stack, and cover the same cells at its size. A
 * stack left with none is its Widget on its own; one showing a Widget it
 * doesn't hold shows its first.
 */
function safeStacks(entries: readonly LayoutEntry[]): LayoutEntry[] {
  const claimed = new Set<WidgetId>();
  const heads = new Map<WidgetId, LayoutEntry>();
  for (const entry of entries) {
    if (!entry.visible || !Array.isArray(entry.stacked)) continue;
    const stacked = entry.stacked.filter((member) => {
      const own = Object.hasOwn(widgets, member) ? entryOf(entries, member) : undefined;
      if (!own || own.visible || member === entry.widget || claimed.has(member) || !fitsStack(entry, member)) return false;
      claimed.add(member);
      return true;
    });
    if (stacked.length) {
      const shown = typeof entry.shown === 'string' && stacked.includes(entry.shown) ? { shown: entry.shown } : {};
      heads.set(entry.widget, { ...alone(entry), stacked, ...shown });
    }
  }
  return entries.map((entry) => heads.get(entry.widget) ?? (entry.stacked !== undefined || entry.shown !== undefined ? alone(entry) : entry));
}
