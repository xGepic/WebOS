import { createWebOS, type PlacedWidget, type WebOS, type WidgetId } from './index';
import { createMemoryStorage, createTestClock } from './testing';

const clock = () => createTestClock(new Date(2026, 10, 12, 9, 0));

async function webosWith(storage = createMemoryStorage()) {
  return createWebOS({ storage, clock: clock() });
}

/** Each visible Widget as "size@column,row", the way a test reads a layout. */
const where = (webos: WebOS): Partial<Record<WidgetId, string>> =>
  Object.fromEntries(webos.desktop.layout().map((p) => [p.widget, `${p.size}@${p.column},${p.row}`]));

const cellsOf = (p: PlacedWidget) =>
  Array.from({ length: p.columns * p.rows }, (_, i) => `${p.column + (i % p.columns)},${p.row + Math.floor(i / p.columns)}`);

/** No overlaps, everything on the grid, each Widget once (shown or hidden). */
function expectValidLayout(webos: WebOS) {
  const { grid } = webos.desktop;
  const placed = webos.desktop.layout();
  const cells = placed.flatMap(cellsOf);
  expect(new Set(cells).size).toBe(cells.length);
  for (const p of placed) {
    expect(p.column).toBeGreaterThanOrEqual(0);
    expect(p.row).toBeGreaterThanOrEqual(0);
    expect(p.column + p.columns).toBeLessThanOrEqual(grid.columns);
    expect(p.row + p.rows).toBeLessThanOrEqual(grid.rows);
  }
  const all = [...placed.map((p) => p.widget), ...webos.desktop.hidden()];
  expect([...all].sort()).toEqual(Object.keys(webos.desktop.widgets).sort());
}

// The default layout: Clock M (4×2) at 0,0; Links M (4×4) at 0,2; Todos M (4×4) at 8,0; Notes M (4×4) at 8,4.

describe('moving a Widget', () => {
  it('moves it to free cells, leaving the others where they are', async () => {
    const webos = await webosWith();

    await webos.desktop.move('clock', 4, 3);

    expect(where(webos)).toEqual({ clock: 'M@4,3', links: 'M@0,2', todos: 'M@8,0', notes: 'M@8,4' });
  });

  it('pushes a Widget it lands on to the next free position', async () => {
    const webos = await webosWith();

    await webos.desktop.move('clock', 0, 2);

    // Links no longer fits at 0,2; reading on from there, the first place it fits is 4,2.
    expect(where(webos)).toEqual({ clock: 'M@0,2', links: 'M@4,2', todos: 'M@8,0', notes: 'M@8,4' });
    expectValidLayout(webos);
  });

  it('keeps a Widget dropped past the edge on the grid', async () => {
    const webos = await webosWith();

    await webos.desktop.move('clock', 11, -3);

    expect(where(webos).clock).toBe('M@8,0');
    expectValidLayout(webos);
  });

  it('is refused when a Widget it would push has no room anywhere', async () => {
    const webos = await webosWith();
    await webos.desktop.resize('links', 'L');
    const before = where(webos);

    // Links at L (6 × 5) over Todos and Notes: Todos finds room, then Notes fits nowhere.
    expect(await webos.desktop.move('links', 6, 3)).toBe(false);

    expect(where(webos)).toEqual(before);
  });

  it('says it was applied when it was', async () => {
    const webos = await webosWith();

    expect(await webos.desktop.move('clock', 0, 2)).toBe(true);
    expect(await webos.desktop.resize('clock', 'S')).toBe(true);
  });

  it('wraps around to the top when nothing is free further on', async () => {
    const webos = await webosWith();

    await webos.desktop.move('links', 8, 4);

    // Notes is pushed; nothing after 8,4 fits a 4 × 4 Widget, so it wraps and lands at 4,0.
    expect(where(webos)).toEqual({ clock: 'M@0,0', links: 'M@8,4', todos: 'M@8,0', notes: 'M@4,0' });
    expectValidLayout(webos);
  });
});

describe('resizing a Widget', () => {
  it('pushes the Widgets its new size covers', async () => {
    const webos = await webosWith();

    await webos.desktop.resize('clock', 'L');

    expect(where(webos)).toEqual({ clock: 'L@0,0', links: 'M@0,3', todos: 'M@8,0', notes: 'M@8,4' });
    expectValidLayout(webos);
  });

  it('shifts a Widget that would grow past the edge back onto the grid', async () => {
    const webos = await webosWith();
    await webos.desktop.hide('todos');

    await webos.desktop.resize('notes', 'L');

    expect(where(webos).notes).toBe('L@6,3');
    expectValidLayout(webos);
  });

  it('is refused when a Widget it would push has no room anywhere, leaving every size as chosen', async () => {
    const webos = await webosWith();
    await webos.desktop.resize('links', 'L');
    const before = where(webos);

    // Notes at L would cover Todos, and Todos (4 × 4) fits nowhere else.
    expect(await webos.desktop.resize('notes', 'L')).toBe(false);

    expect(where(webos)).toEqual(before);
  });
});

describe('hiding and showing Widgets', () => {
  it('hides a Widget and shows it again where it was', async () => {
    const webos = await webosWith();

    await webos.desktop.hide('notes');
    expect(Object.keys(where(webos))).not.toContain('notes');
    expect(webos.desktop.hidden()).toEqual(['notes']);

    expect(await webos.desktop.show('notes')).toBe(true);
    expect(where(webos).notes).toBe('M@8,4');
    expect(webos.desktop.hidden()).toEqual([]);
  });

  it('shows a Widget at the next free position when its place was taken meanwhile', async () => {
    const webos = await webosWith();
    await webos.desktop.hide('notes');
    await webos.desktop.move('links', 8, 4);

    await webos.desktop.show('notes');

    // Reading on from 8,4 wraps to the top, where 4,0 is the first place a 4 × 4 Widget fits.
    expect(where(webos).notes).toBe('M@4,0');
    expectValidLayout(webos);
  });
});

describe('one instance of each Widget', () => {
  it('never adds a second instance by showing a Widget that is already shown', async () => {
    const webos = await webosWith();

    expect(await webos.desktop.show('clock')).toBe(true);

    expect(webos.desktop.layout().filter((p) => p.widget === 'clock')).toHaveLength(1);
  });

  it('keeps one instance when the stored layout lists a Widget twice', async () => {
    const storage = createMemoryStorage();
    const first = await webosWith(storage);
    await first.desktop.move('clock', 4, 3);
    const stored = (await storage.read()) as { layout: unknown[] };
    await storage.write({ ...stored, layout: [...stored.layout, { widget: 'clock', size: 'S', column: 0, row: 6, visible: true }] });

    const nextTab = await webosWith(storage);

    expect(where(nextTab).clock).toBe('M@4,3');
    expectValidLayout(nextTab);
  });

  it('keeps every move, resize, hide and show free of overlaps and duplicates', async () => {
    const webos = await webosWith();
    const ids = Object.keys(webos.desktop.widgets) as (keyof typeof webos.desktop.widgets)[];
    const sizes = ['S', 'M', 'L'] as const;
    // A fixed pseudo-random sequence, so a failure can be replayed.
    let seed = 7;
    const next = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };

    for (let step = 0; step < 300; step++) {
      const widget = ids[next(ids.length)];
      const action = next(4);
      if (action === 0) await webos.desktop.move(widget, next(14) - 1, next(10) - 1);
      if (action === 1) await webos.desktop.resize(widget, sizes[next(3)]);
      if (action === 2) await webos.desktop.hide(widget);
      if (action === 3) await webos.desktop.show(widget);
      expectValidLayout(webos);
    }
  });
});

describe('the saved layout', () => {
  it('follows changes made in another open tab', async () => {
    const storage = createMemoryStorage();
    const webos = await webosWith(storage);
    const otherTab = await webosWith(storage.openTab());

    await otherTab.desktop.move('clock', 0, 2);
    await otherTab.desktop.hide('notes');

    expect(where(webos)).toEqual({ clock: 'M@0,2', links: 'M@4,2', todos: 'M@8,0' });
    expect(webos.desktop.hidden()).toEqual(['notes']);
  });

  it('makes a layout from another tab safe before using it', async () => {
    const storage = createMemoryStorage();
    const webos = await webosWith(storage);
    const otherTab = storage.openTab();
    const stored = (await otherTab.read()) as { layout: unknown[] };

    // Another build writes Links over the Clock and repeats Todos.
    await otherTab.write({
      ...stored,
      layout: [
        { widget: 'clock', size: 'M', column: 0, row: 0, visible: true },
        { widget: 'links', size: 'M', column: 1, row: 1, visible: true },
        { widget: 'todos', size: 'M', column: 8, row: 0, visible: true },
        { widget: 'todos', size: 'S', column: 0, row: 6, visible: true },
      ],
    });

    expectValidLayout(webos);
    expect(webos.desktop.hidden()).toEqual(['notes']);
  });

  it('is the same in the next tab', async () => {
    const storage = createMemoryStorage();
    const webos = await webosWith(storage);
    await webos.desktop.move('clock', 0, 2);
    await webos.desktop.resize('todos', 'S');
    await webos.desktop.hide('notes');

    const nextTab = await webosWith(storage);

    expect(where(nextTab)).toEqual(where(webos));
    expect(nextTab.desktop.hidden()).toEqual(['notes']);
  });
});
