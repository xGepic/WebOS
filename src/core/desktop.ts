/** The Desktop's snap grid, in cells. Widgets are placed and sized in whole cells. */
export const grid = { columns: 12, rows: 8 } as const;

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
      M: { columns: 4, rows: 2 },
      L: { columns: 6, rows: 3 },
    },
  },
  links: {
    name: 'Links',
    sizes: {
      S: { columns: 3, rows: 3 },
      M: { columns: 4, rows: 4 },
      L: { columns: 6, rows: 5 },
    },
  },
} as const satisfies Record<string, WidgetDefinition>;

export type WidgetId = keyof typeof widgets;

/** Where a Widget sits: its size and its top-left cell (0-based). */
export interface Placement {
  widget: WidgetId;
  size: WidgetSize;
  column: number;
  row: number;
}

/** A Widget on the Desktop, with the cells its size spans. */
export interface PlacedWidget extends Placement, Span {}

/** Where each Widget sits on a fresh Desktop. Every Widget is visible. */
const defaultLayout: readonly Placement[] = [
  { widget: 'clock', size: 'M', column: 0, row: 0 },
  { widget: 'links', size: 'M', column: 0, row: 2 },
];

export function layout(): readonly PlacedWidget[] {
  return defaultLayout.map((placement) => ({
    ...placement,
    ...widgets[placement.widget].sizes[placement.size],
  }));
}
