import { createWebOS, type PlacedWidget } from './index';
import { createMemoryStorage, createTestClock } from './testing';

async function freshWebOS() {
  return createWebOS({
    storage: createMemoryStorage(),
    clock: createTestClock(new Date(2026, 10, 12, 9, 0)),
  });
}

describe('default Desktop layout', () => {
  it('contains every Widget in the catalog exactly once', async () => {
    const { desktop } = await freshWebOS();

    const placed = desktop.layout().map((p) => p.widget).sort();

    expect(placed).toEqual(Object.keys(desktop.widgets).sort());
  });
});

describe('default Desktop layout geometry', () => {
  const cellsOf = (p: PlacedWidget) =>
    Array.from({ length: p.columns * p.rows }, (_, i) => `${p.column + (i % p.columns)},${p.row + Math.floor(i / p.columns)}`);

  it('places every Widget inside the grid', async () => {
    const { desktop } = await freshWebOS();

    for (const placed of desktop.layout()) {
      expect(placed.column).toBeGreaterThanOrEqual(0);
      expect(placed.row).toBeGreaterThanOrEqual(0);
      expect(placed.column + placed.columns).toBeLessThanOrEqual(desktop.grid.columns);
      expect(placed.row + placed.rows).toBeLessThanOrEqual(desktop.grid.rows);
    }
  });

  it('has no two Widgets covering the same cell', async () => {
    const { desktop } = await freshWebOS();

    const cells = desktop.layout().flatMap(cellsOf);

    expect(new Set(cells).size).toBe(cells.length);
  });

  it('is the Stage layout: Weather, the Clock and Calendar across the top, Links, Todos and Notes in a row beneath', async () => {
    const { desktop } = await freshWebOS();

    expect(desktop.layout().map((p) => `${p.widget} ${p.size} ${p.columns}×${p.rows}@${p.column},${p.row}`)).toEqual([
      'weather S 3×3@0,0',
      'clock M 6×3@3,0',
      'calendar S 3×3@9,0',
      'links M 4×5@0,3',
      'todos M 4×5@4,3',
      'notes M 4×5@8,3',
    ]);
  });

  it('fills every cell of the grid', async () => {
    const { desktop } = await freshWebOS();

    expect(desktop.layout().flatMap(cellsOf)).toHaveLength(desktop.grid.columns * desktop.grid.rows);
  });
});
