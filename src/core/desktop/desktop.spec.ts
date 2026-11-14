import { createWebOS, type PlacedWidget } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

async function freshWebOS() {
  return createWebOS({
    storage: createMemoryStorage(),
    clock: createTestClock(new Date(2026, 10, 12, 9, 0)),
  });
}

describe('default Desktop layout', () => {
  it('contains every Widget in the catalog exactly once, shown or hidden', async () => {
    const { desktop } = await freshWebOS();

    const all = [...desktop.layout().map((p) => p.widget), ...desktop.hidden()].sort();

    expect(all).toEqual(Object.keys(desktop.widgets).sort());
  });

  it('shows every Widget at once', async () => {
    const { desktop } = await freshWebOS();

    expect(desktop.hidden()).toEqual([]);
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

  it('is the Stage layout: a top band of five Widgets with the Clock and Search in the middle, and Today, Todos, a Countdown, System, Moon and Recent beneath', async () => {
    const { desktop } = await freshWebOS();

    expect(desktop.layout().map((p) => `${p.widget} ${p.size} ${p.columns}×${p.rows}@${p.column},${p.row}`)).toEqual([
      'world-clock M 3×3@0,0',
      'weather S 3×3@3,0',
      'clock M 7×2@7,0',
      'calendar S 3×3@15,0',
      'sun M 3×3@18,0',
      'search M 7×1@7,2',
      'today M 3×5@0,3',
      'todos M 3×5@3,3',
      'recent M 3×5@18,3',
      'countdown S 3×2@9,6',
      'system S 3×2@12,6',
      'moon S 3×2@15,6',
    ]);
  });

  it('centres the Clock and Search, with a one-column gap either side of them, and leaves a 3 × 5 and a 9 × 3 space free for Edit Mode', async () => {
    const { desktop } = await freshWebOS();
    const clock = desktop.layout().find((p) => p.widget === 'clock')!;

    expect(clock.column).toBe(desktop.grid.columns - (clock.column + clock.columns));
    expect(desktop.layout().flatMap(cellsOf)).toHaveLength(desktop.grid.columns * desktop.grid.rows - 2 * 3 - 3 * 5 - 9 * 3);
  });
});
