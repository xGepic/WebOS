import { createWebOS, type PlacedWidget, type WebOS, type WidgetId } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

const clock = () => createTestClock(new Date(2026, 10, 12, 9, 0));

/**
 * A Desktop with room to spare: Moon, Sun, New Tabs and System at S (3×2 each)
 * side by side along the top from 0,0; the Clock at S (3×2) at 12,0; Weather at
 * S (3×3) at 0,2. The rest hidden.
 */
const ROOMY = [
  { widget: 'moon', size: 'S', column: 0, row: 0, visible: true },
  { widget: 'sun', size: 'S', column: 3, row: 0, visible: true },
  { widget: 'new-tabs', size: 'S', column: 6, row: 0, visible: true },
  { widget: 'system', size: 'S', column: 9, row: 0, visible: true },
  { widget: 'clock', size: 'S', column: 12, row: 0, visible: true },
  { widget: 'weather', size: 'S', column: 0, row: 2, visible: true },
];

/** A webOS whose stored layout is `layout`, in an otherwise fresh document of the current schema. */
async function webosWith(layout: readonly object[] = ROOMY) {
  const fresh = createMemoryStorage();
  await createWebOS({ storage: fresh, clock: clock() });
  const storage = createMemoryStorage({ ...((await fresh.read()) as object), layout });
  return { webos: await createWebOS({ storage, clock: clock() }), storage };
}

/** Each visible place as "size@column,row", with a stack's Widgets and the one it shows: "S@0,0 moon+[sun]". */
const where = (webos: WebOS): Partial<Record<WidgetId, string>> =>
  Object.fromEntries(
    webos.desktop.layout().map((p) => {
      const stack = p.stack ? ' ' + p.stack.map((w) => (w === p.shown ? `[${w}]` : w)).join('+') : '';
      return [p.widget, `${p.size}@${p.column},${p.row}${stack}`];
    }),
  );

const cellsOf = (p: PlacedWidget) =>
  Array.from({ length: p.columns * p.rows }, (_, i) => `${p.column + (i % p.columns)},${p.row + Math.floor(i / p.columns)}`);

/** No overlaps, and each Widget once: on the grid, in a stack, or hidden. */
function expectValidLayout(webos: WebOS) {
  const placed = webos.desktop.layout();
  const cells = placed.flatMap(cellsOf);
  expect(new Set(cells).size).toBe(cells.length);
  const all = [...placed.flatMap((p) => p.stack ?? [p.widget]), ...webos.desktop.hidden()];
  expect([...all].sort()).toEqual(Object.keys(webos.desktop.widgets).sort());
}

describe('stacking Widgets', () => {
  it('stacks a Widget onto another of the same size, in its place, showing the one added', async () => {
    const { webos } = await webosWith();

    expect(await webos.desktop.stack('sun', 'moon')).toBe(true);

    expect(where(webos)).toMatchObject({ moon: 'S@0,0 moon+[sun]' });
    expect(where(webos)).not.toHaveProperty('sun');
    expect(webos.desktop.hidden()).not.toContain('sun');
    expectValidLayout(webos);
  });

  it('adds more to a stack, and moves a whole stack onto another', async () => {
    const { webos } = await webosWith();

    await webos.desktop.stack('sun', 'moon');
    await webos.desktop.stack('new-tabs', 'moon');
    await webos.desktop.stack('system', 'clock');
    expect(where(webos)).toMatchObject({ moon: 'S@0,0 moon+sun+[new-tabs]', clock: 'S@12,0 clock+[system]' });

    await webos.desktop.stack('clock', 'moon');

    expect(where(webos)).toMatchObject({ moon: 'S@0,0 moon+sun+new-tabs+clock+[system]' });
    expect(where(webos)).not.toHaveProperty('clock');
    expectValidLayout(webos);
  });

  it('refuses a Widget of another size, the same Widget, or a hidden one, changing nothing', async () => {
    const { webos } = await webosWith();
    const before = where(webos);

    expect(await webos.desktop.stack('weather', 'moon')).toBe(false);
    expect(await webos.desktop.stack('moon', 'moon')).toBe(false);
    expect(await webos.desktop.stack('calendar', 'moon')).toBe(false);

    expect(where(webos)).toEqual(before);
  });

  it('says beforehand whether a Widget can be stacked onto another', async () => {
    const { webos } = await webosWith();

    expect(webos.desktop.canStack('sun', 'moon')).toBe(true);
    expect(webos.desktop.canStack('weather', 'moon')).toBe(false);
    expect(webos.desktop.canStack('moon', 'moon')).toBe(false);
  });

  it('shows the Widget chosen, and opens on it in a new tab', async () => {
    const { webos, storage } = await webosWith();
    await webos.desktop.stack('sun', 'moon');

    await webos.desktop.showInStack('moon');
    expect(where(webos)).toMatchObject({ moon: 'S@0,0 [moon]+sun' });

    const newTab = await createWebOS({ storage, clock: clock() });
    expect(where(newTab)).toMatchObject({ moon: 'S@0,0 [moon]+sun' });
  });

  it('moves and resizes as one, and refuses a size its Widgets don’t share', async () => {
    const { webos } = await webosWith();
    await webos.desktop.stack('sun', 'moon');

    await webos.desktop.move('moon', 15, 5);
    expect(where(webos)).toMatchObject({ moon: 'S@15,5 moon+[sun]' });

    // At M both Moon and Sun are 3×3; at L Moon is 4×4 and Sun 6×3.
    expect(await webos.desktop.resize('moon', 'M')).toBe(true);
    expect(where(webos)).toMatchObject({ moon: 'M@15,5 moon+[sun]' });
    expect(await webos.desktop.resize('moon', 'L')).toBe(false);
    expect(where(webos)).toMatchObject({ moon: 'M@15,5 moon+[sun]' });
    expectValidLayout(webos);
  });
});

describe('taking Widgets out of a stack', () => {
  it('unstacks a Widget to the next free place from the stack, at the stack’s size', async () => {
    const { webos } = await webosWith();
    await webos.desktop.stack('sun', 'moon');

    expect(await webos.desktop.unstack('sun')).toBe(true);

    expect(where(webos)).toMatchObject({ moon: 'S@0,0', sun: 'S@3,0' });
    expectValidLayout(webos);
  });

  it('leaves the rest of the stack in its place when the Widget at its place is taken out', async () => {
    const { webos } = await webosWith();
    await webos.desktop.stack('sun', 'moon');
    await webos.desktop.stack('new-tabs', 'moon');

    await webos.desktop.unstack('moon');

    expect(where(webos)).toMatchObject({ sun: 'S@0,0 sun+[new-tabs]', moon: 'S@3,0' });
    expectValidLayout(webos);
  });

  it('shows the next Widget when the one shown is taken out', async () => {
    const { webos } = await webosWith();
    await webos.desktop.stack('sun', 'moon');
    await webos.desktop.stack('new-tabs', 'moon');
    await webos.desktop.showInStack('sun');

    await webos.desktop.unstack('sun');

    expect(where(webos)).toMatchObject({ moon: 'S@0,0 moon+[new-tabs]' });
  });

  it('hides only the Widget hidden, and a stack of one is a Widget again', async () => {
    const { webos } = await webosWith();
    await webos.desktop.stack('sun', 'moon');
    await webos.desktop.stack('new-tabs', 'moon');

    await webos.desktop.hide('sun');
    expect(where(webos)).toMatchObject({ moon: 'S@0,0 moon+[new-tabs]' });
    expect(webos.desktop.hidden()).toContain('sun');

    await webos.desktop.hide('moon');
    expect(where(webos)).toMatchObject({ 'new-tabs': 'S@0,0' });
    expect(webos.desktop.hidden()).toEqual(expect.arrayContaining(['moon', 'sun']));
    expectValidLayout(webos);
  });

  it('never shows a stacked Widget a second time from the hidden list', async () => {
    const { webos } = await webosWith();
    await webos.desktop.stack('sun', 'moon');

    expect(await webos.desktop.show('sun')).toBe(false);
    expectValidLayout(webos);
  });

  it('refuses to unstack a Widget that isn’t in a stack', async () => {
    const { webos } = await webosWith();

    expect(await webos.desktop.unstack('moon')).toBe(false);
  });
});

describe('a saved stack', () => {
  it('keeps only Widgets that can be in it, and shows the first when the one shown can’t be', async () => {
    const { webos } = await webosWith([
      // Sun can be; an unknown Widget, Moon itself, Weather (another size) and System (on the Desktop) can't.
      { widget: 'moon', size: 'S', column: 0, row: 0, visible: true, stacked: ['sun', 'nope', 'moon', 'weather', 'system'], shown: 'nope' },
      { widget: 'sun', size: 'S', column: 0, row: 0, visible: false },
      { widget: 'weather', size: 'S', column: 0, row: 0, visible: false },
      { widget: 'system', size: 'S', column: 9, row: 0, visible: true },
    ]);

    expect(where(webos)).toMatchObject({ moon: 'S@0,0 [moon]+sun', system: 'S@9,0' });
    expect(webos.desktop.hidden()).toContain('weather');
    expectValidLayout(webos);
  });

  it('lets a Widget be in one stack only', async () => {
    const { webos } = await webosWith([
      { widget: 'moon', size: 'S', column: 0, row: 0, visible: true, stacked: ['sun'] },
      { widget: 'clock', size: 'S', column: 3, row: 0, visible: true, stacked: ['sun', 'system'] },
      { widget: 'sun', size: 'S', column: 0, row: 0, visible: false },
      { widget: 'system', size: 'S', column: 0, row: 0, visible: false },
    ]);

    expect(where(webos)).toMatchObject({ moon: 'S@0,0 [moon]+sun', clock: 'S@3,0 [clock]+system' });
    expectValidLayout(webos);
  });

  it('breaks up a hidden stack, hiding its Widgets', async () => {
    const { webos } = await webosWith([
      { widget: 'moon', size: 'S', column: 0, row: 0, visible: false, stacked: ['sun'] },
      { widget: 'sun', size: 'S', column: 0, row: 0, visible: false },
    ]);

    expect(webos.desktop.hidden()).toEqual(expect.arrayContaining(['moon', 'sun']));
    expectValidLayout(webos);
  });
});
