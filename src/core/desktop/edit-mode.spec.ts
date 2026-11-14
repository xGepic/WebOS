import { createWebOS, type PlacedWidget, type WebOS, type WidgetId } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

const clock = () => createTestClock(new Date(2026, 10, 12, 9, 0));

async function webosWith(storage = roomyStorage()) {
  return createWebOS({ storage, clock: clock() });
}

/** The Widgets this layout doesn't mention, which it therefore hides, in catalog order. */
const UNMENTIONED = ['world-clock', 'countdown', 'moon', 'sun', 'system', 'top-sites', 'search'];

/**
 * The default (Stage) layout leaves no room for a Widget to move into, so most tests
 * start from this one instead, which leaves room to move into:
 * Clock S (3×2) at 0,0; Recent M (3×5) at 0,2; Todos M (3×5) at 9,0; Today S (3×3) at 18,5.
 * Weather and Calendar are hidden, and so are the Widgets it doesn't mention.
 */
function roomyStorage() {
  return createMemoryStorage({
    schemaVersion: 12,
    profile: { name: '' },
    apps: {},
    linkGroups: [],
    dockedLinkIds: [],
    todos: [],
    notes: [],
    pinnedNoteId: null,
    layout: [
      { widget: 'clock', size: 'S', column: 0, row: 0, visible: true },
      { widget: 'recent', size: 'M', column: 0, row: 2, visible: true },
      { widget: 'todos', size: 'M', column: 9, row: 0, visible: true },
      { widget: 'today', size: 'S', column: 18, row: 5, visible: true },
      { widget: 'weather', size: 'S', column: 0, row: 0, visible: false },
      { widget: 'calendar', size: 'S', column: 0, row: 0, visible: false },
    ],
    weather: { city: null, report: null },
    countdowns: [],
    worldClocks: [],
    github: { token: '', contributions: null },
  });
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

describe('moving a Widget', () => {
  it('moves it to free cells, leaving the others where they are', async () => {
    const webos = await webosWith();

    await webos.desktop.move('clock', 4, 3);

    expect(where(webos)).toEqual({ clock: 'S@4,3', recent: 'M@0,2', todos: 'M@9,0', today: 'S@18,5' });
  });

  it('pushes a Widget it lands on to the next free position', async () => {
    const webos = await webosWith();

    await webos.desktop.move('clock', 0, 2);

    // Links no longer fits at 0,2; reading on from there, the first place it fits is 3,2.
    expect(where(webos)).toEqual({ clock: 'S@0,2', recent: 'M@3,2', todos: 'M@9,0', today: 'S@18,5' });
    expectValidLayout(webos);
  });

  it('keeps a Widget dropped past the edge on the grid', async () => {
    const webos = await webosWith();

    await webos.desktop.move('clock', 25, -3);

    expect(where(webos).clock).toBe('S@18,0');
    expectValidLayout(webos);
  });

  it('is refused when a Widget it would push has no room anywhere', async () => {
    const webos = await webosWith(createMemoryStorage());
    const before = where(webos);

    // On the Stage Desktop, the Clock dropped onto Today and Todos pushes them out, and no space five rows tall is left for them.
    expect(await webos.desktop.move('clock', 0, 3)).toBe(false);

    expect(where(webos)).toEqual(before);
  });

  it('swaps two Widgets of the same size on the Stage Desktop', async () => {
    const webos = await webosWith(createMemoryStorage());

    // Today onto Todos: no 3 × 5 space is free further along, so Todos takes the place Today left.
    expect(await webos.desktop.move('today', 3, 3)).toBe(true);

    expect(where(webos)).toEqual({
      'world-clock': 'M@0,0',
      weather: 'S@3,0',
      clock: 'M@7,0',
      search: 'M@7,2',
      calendar: 'S@15,0',
      sun: 'M@18,0',
      today: 'M@3,3',
      todos: 'M@0,3',
      'top-sites': 'M@7,3',
      recent: 'M@18,3',
      countdown: 'S@9,6',
      system: 'S@12,6',
      moon: 'S@15,6',
    });
    expectValidLayout(webos);
  });

  it('says it was applied when it was', async () => {
    const webos = await webosWith();

    expect(await webos.desktop.move('clock', 0, 2)).toBe(true);
    expect(await webos.desktop.resize('todos', 'S')).toBe(true);
  });

  it('wraps around to the top when nothing is free further on', async () => {
    const webos = await webosWith();

    await webos.desktop.move('recent', 18, 3);

    // Recent covers Today. Nothing after 18,5 fits a 3 × 3 Widget, so Today wraps to the top and lands at 3,0.
    expect(where(webos)).toEqual({ clock: 'S@0,0', recent: 'M@18,3', todos: 'M@9,0', today: 'S@3,0' });
    expectValidLayout(webos);
  });
});

describe('resizing a Widget', () => {
  it('pushes the Widgets its new size covers', async () => {
    const webos = await webosWith();

    await webos.desktop.resize('clock', 'L');

    // The wide Clock covers Todos and Links; in reading order they move to the first free places, beside it.
    expect(where(webos)).toEqual({ clock: 'L@0,0', todos: 'M@12,0', recent: 'M@15,2', today: 'S@18,5' });
    expectValidLayout(webos);
  });

  it('shifts a Widget that would grow past the edge back onto the grid', async () => {
    const webos = await webosWith();
    await webos.desktop.hide('todos');

    await webos.desktop.resize('today', 'L');

    expect(where(webos).today).toBe('L@17,2');
    expectValidLayout(webos);
  });

  it('is refused when a Widget it would push has no room anywhere, leaving every size as chosen', async () => {
    const webos = await webosWith(createMemoryStorage());
    const before = where(webos);

    // On the Stage Desktop, the Clock at L (12 × 3) covers Calendar, Sun and Search, and Search then fits nowhere.
    expect(await webos.desktop.resize('clock', 'L')).toBe(false);

    expect(where(webos)).toEqual(before);
  });
});

describe('hiding and showing Widgets', () => {
  it('hides a Widget and shows it again where it was', async () => {
    const webos = await webosWith();

    await webos.desktop.hide('today');
    expect(Object.keys(where(webos))).not.toContain('today');
    expect(webos.desktop.hidden()).toEqual(['weather', 'calendar', 'world-clock', 'countdown', 'moon', 'sun', 'system', 'today', 'top-sites', 'search']);

    expect(await webos.desktop.show('today')).toBe(true);
    expect(where(webos).today).toBe('S@18,5');
    expect(webos.desktop.hidden()).toEqual(['weather', 'calendar', ...UNMENTIONED]);
  });

  it('shows a Widget at size S, whatever size it had, so it starts small', async () => {
    const webos = await webosWith();
    expect(webos.desktop.hidden()).toContain('top-sites');
    expect(await webos.desktop.resize('today', 'M')).toBe(true);
    await webos.desktop.hide('today');

    expect(await webos.desktop.show('top-sites')).toBe(true);
    expect(await webos.desktop.show('today')).toBe(true);

    expect(where(webos)['top-sites']).toMatch(/^S@/);
    expect(where(webos).today).toMatch(/^S@/);
    expectValidLayout(webos);
  });

  it('shows a Widget at the next free position when its place was taken meanwhile', async () => {
    const webos = await webosWith();
    await webos.desktop.hide('today');
    await webos.desktop.move('recent', 18, 3);

    await webos.desktop.show('today');

    // Links took 18,5; reading on from there wraps to the top, where 3,0 is the first place a 3 × 3 Widget fits.
    expect(where(webos).today).toBe('S@3,0');
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
    const storage = roomyStorage();
    const first = await webosWith(storage);
    await first.desktop.move('clock', 4, 3);
    const stored = (await storage.read()) as { layout: unknown[] };
    await storage.write({ ...stored, layout: [...stored.layout, { widget: 'clock', size: 'S', column: 0, row: 6, visible: true }] });

    const nextTab = await webosWith(storage);

    expect(where(nextTab).clock).toBe('S@4,3');
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
    const storage = roomyStorage();
    const webos = await webosWith(storage);
    const otherTab = await webosWith(storage.openTab());

    await otherTab.desktop.move('clock', 0, 2);
    await otherTab.desktop.hide('today');

    expect(where(webos)).toEqual({ clock: 'S@0,2', recent: 'M@3,2', todos: 'M@9,0' });
    expect(webos.desktop.hidden()).toEqual(['weather', 'calendar', 'world-clock', 'countdown', 'moon', 'sun', 'system', 'today', 'top-sites', 'search']);
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
        { widget: 'recent', size: 'M', column: 1, row: 1, visible: true },
        { widget: 'todos', size: 'M', column: 8, row: 0, visible: true },
        { widget: 'todos', size: 'S', column: 0, row: 6, visible: true },
      ],
    });

    expectValidLayout(webos);
    // Weather, Calendar and the others aren't in that layout, so they are hidden, in catalog order.
    expect(webos.desktop.hidden()).toEqual(['weather', 'calendar', 'world-clock', 'countdown', 'moon', 'sun', 'system', 'today', 'top-sites', 'search']);
  });

  it('is the same in the next tab', async () => {
    const storage = roomyStorage();
    const webos = await webosWith(storage);
    await webos.desktop.move('clock', 0, 2);
    await webos.desktop.resize('todos', 'S');
    await webos.desktop.hide('today');

    const nextTab = await webosWith(storage);

    expect(where(nextTab)).toEqual(where(webos));
    expect(nextTab.desktop.hidden()).toEqual(['weather', 'calendar', 'world-clock', 'countdown', 'moon', 'sun', 'system', 'today', 'top-sites', 'search']);
  });
});
