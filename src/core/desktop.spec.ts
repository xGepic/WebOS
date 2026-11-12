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

  it('places the Clock at medium size, spanning 4 × 2 cells', async () => {
    const { desktop } = await freshWebOS();

    const clock = desktop.layout().find((p) => p.widget === 'clock');

    expect(clock).toMatchObject({ size: 'M', columns: 4, rows: 2 });
  });
});
