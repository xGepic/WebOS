import type { SpringPreset } from './springs';
import { slideBetween } from './flip';

/**
 * Framework-agnostic helpers for elements laid out on a CSS grid: which cell
 * an element is over (for dropping a dragged one), and springing elements to
 * their new places after the layout changes.
 */

/** A cell of a CSS grid, 0-based from the top left. */
export interface GridCell {
  column: number;
  row: number;
}

/** Where each of a grid's columns and rows starts on screen, read from its laid-out tracks. */
function trackStarts(grid: HTMLElement): { columns: number[]; rows: number[] } {
  const style = getComputedStyle(grid);
  const box = grid.getBoundingClientRect();
  const starts = (tracks: string, gap: string, origin: number) => {
    let at = origin;
    return tracks
      .split(' ')
      .map(parseFloat)
      .map((size) => {
        const start = at;
        at += size + parseFloat(gap);
        return start;
      });
  };
  return {
    columns: starts(style.gridTemplateColumns, style.columnGap, box.left + parseFloat(style.paddingLeft)),
    rows: starts(style.gridTemplateRows, style.rowGap, box.top + parseFloat(style.paddingTop)),
  };
}

/** The index of the start nearest to `position`. */
function nearest(starts: readonly number[], position: number): number {
  return starts.reduce((best, start, i) => (Math.abs(start - position) < Math.abs(starts[best] - position) ? i : best), 0);
}

/** The cell of `grid` nearest to where `element`'s top-left corner is on screen now, e.g. while it is dragged. */
export function cellUnder(grid: HTMLElement, element: Element): GridCell {
  const box = element.getBoundingClientRect();
  const starts = trackStarts(grid);
  return { column: nearest(starts.columns, box.left), row: nearest(starts.rows, box.top) };
}

/**
 * An item on the grid: `slot` is the grid item the layout places; `slider` is
 * an element inside it that animations move, so they never fight with whatever
 * else moves the slot (such as a drag).
 */
export interface GridItem {
  key: string;
  slot: HTMLElement;
  slider: HTMLElement;
}

/** Where each item is on screen right now, by key, including any drag or slide in progress. */
export function capturePlaces(items: Iterable<GridItem>): Map<string, DOMRect> {
  return new Map([...items].map((item) => [item.key, item.slider.getBoundingClientRect()]));
}

/**
 * After the layout changed, springs every item that moved from where it was
 * (`before`, from `capturePlaces`) to its new slot. The item with key `moving`
 * uses `movingPreset`; the others move smoothly.
 */
export function slideToNewPlaces(
  before: ReadonlyMap<string, DOMRect>,
  items: Iterable<GridItem>,
  { moving, movingPreset = 'momentum' }: { moving?: string; movingPreset?: SpringPreset } = {},
): void {
  for (const item of items) {
    const was = before.get(item.key);
    if (was) slideBetween(item.slider, was, item.slot.getBoundingClientRect(), item.key === moving ? movingPreset : 'smooth');
  }
}
