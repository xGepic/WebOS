import { createWebOS } from './index';
import { createMemoryStorage, createTestClock } from './testing';

async function webosAt(date: Date) {
  const clock = createTestClock(date);
  const storage = createMemoryStorage();
  const webos = await createWebOS({ storage, clock });
  return { webos, clock, storage };
}

const at = (hours: number, minutes: number, seconds = 0) =>
  new Date(2026, 10, 12, hours, minutes, seconds);

describe('greeting', () => {
  it.each([
    [0, 0, 'Good night'],
    [4, 59, 'Good night'],
    [5, 0, 'Good morning'],
    [11, 59, 'Good morning'],
    [12, 0, 'Good afternoon'],
    [16, 59, 'Good afternoon'],
    [17, 0, 'Good evening'],
    [21, 59, 'Good evening'],
    [22, 0, 'Good night'],
    [23, 59, 'Good night'],
  ])('at %i:%i is "%s"', async (hours, minutes, expected) => {
    const { webos } = await webosAt(at(hours, minutes));
    expect(webos.profile.greeting()).toBe(expected);
  });
});

describe('clock', () => {
  it.each([
    [0, 0, '12:00 AM'],
    [9, 5, '9:05 AM'],
    [12, 0, '12:00 PM'],
    [23, 59, '11:59 PM'],
  ])('shows %i:%i in 12-hour format as "%s"', async (hours, minutes, expected) => {
    const { webos } = await webosAt(at(hours, minutes));
    expect(webos.clock.time()).toBe(expected);
  });

  it("shows today's date", async () => {
    const { webos } = await webosAt(at(9, 5));
    expect(webos.clock.date()).toBe('Thursday, November 12');
  });
});

describe('updates', () => {
  it('notifies subscribers on the minute, not before', async () => {
    const { webos, clock } = await webosAt(at(11, 59, 30));
    const seen: string[] = [];
    webos.subscribe(() => seen.push(`${webos.clock.time()} ${webos.profile.greeting()}`));

    clock.advance(29_999);
    expect(seen).toEqual([]);

    clock.advance(1);
    expect(seen).toEqual(['12:00 PM Good afternoon']);

    clock.advance(60_000);
    expect(seen).toEqual(['12:00 PM Good afternoon', '12:01 PM Good afternoon']);
  });

  it('stops notifying after unsubscribing', async () => {
    const { webos, clock } = await webosAt(at(9, 0));
    let calls = 0;
    const unsubscribe = webos.subscribe(() => calls++);

    unsubscribe();
    clock.advance(60_000);

    expect(calls).toBe(0);
  });
});

// Migrations are checked through public state: an older document must load into a
// working core, and a name set afterwards must survive into the next tab.
describe('state document', () => {
  const clock = () => createTestClock(at(9, 0));

  async function loadsIntoWorkingCore(stored: unknown) {
    const storage = createMemoryStorage(stored);
    const webos = await createWebOS({ storage, clock: clock() });

    expect(webos.profile.name()).toBe('');
    expect(webos.profile.greeting()).toBe('Good morning');

    await webos.profile.setName('Stefan');
    const nextTab = await createWebOS({ storage, clock: clock() });
    expect(nextTab.profile.greeting()).toBe('Good morning, Stefan');
  }

  it('starts a working document when nothing is stored', async () => {
    await loadsIntoWorkingCore(undefined);
  });

  it('migrates an unversioned v0 document forward on load', async () => {
    await loadsIntoWorkingCore({});
  });

  it('migrates a v1 document (ticket 01 to 03 builds) forward on load', async () => {
    await loadsIntoWorkingCore({ schemaVersion: 1 });
  });

  it('keeps the name when migrating a v2 document (ticket 04 builds) forward', async () => {
    const storage = createMemoryStorage({ schemaVersion: 2, profile: { name: 'Stefan' }, apps: {} });

    const webos = await createWebOS({ storage, clock: clock() });

    expect(webos.profile.greeting()).toBe('Good morning, Stefan');
    expect(webos.links.groups()).toEqual([]);
  });

  it('keeps the name and Links when migrating a v3 document (ticket 05 builds) forward', async () => {
    const storage = createMemoryStorage({
      schemaVersion: 3,
      profile: { name: 'Stefan' },
      apps: {},
      linkGroups: [{ id: 'g', name: 'Local', links: [{ id: 'l', title: 'web', url: 'http://localhost:4200' }] }],
    });

    const webos = await createWebOS({ storage, clock: clock() });

    expect(webos.profile.greeting()).toBe('Good morning, Stefan');
    expect(webos.links.groups()[0].links[0].title).toBe('web');
    expect(webos.links.docked()).toEqual([]);
  });

  it('keeps the name, Links and Docked Links when migrating a v4 document (ticket 06 builds) forward', async () => {
    const storage = createMemoryStorage({
      schemaVersion: 4,
      profile: { name: 'Stefan' },
      apps: {},
      linkGroups: [{ id: 'g', name: 'Local', links: [{ id: 'l', title: 'web', url: 'http://localhost:4200' }] }],
      dockedLinkIds: ['l'],
    });

    const webos = await createWebOS({ storage, clock: clock() });

    expect(webos.profile.greeting()).toBe('Good morning, Stefan');
    expect(webos.links.docked().map((link) => link.title)).toEqual(['web']);
    expect(webos.todos.open()).toEqual([]);
  });

  it('keeps everything when migrating a v5 document (ticket 07 builds) forward', async () => {
    const storage = createMemoryStorage({
      schemaVersion: 5,
      profile: { name: 'Stefan' },
      apps: {},
      linkGroups: [{ id: 'g', name: 'Local', links: [{ id: 'l', title: 'web', url: 'http://localhost:4200' }] }],
      dockedLinkIds: ['l'],
      todos: [{ id: 't', text: 'Ship it', createdAt: at(8, 0).getTime(), completedAt: null }],
    });

    const webos = await createWebOS({ storage, clock: clock() });

    expect(webos.profile.greeting()).toBe('Good morning, Stefan');
    expect(webos.links.docked().map((link) => link.title)).toEqual(['web']);
    expect(webos.todos.open().map((todo) => todo.text)).toEqual(['Ship it']);
    expect(webos.notes.list()).toEqual([]);
    expect(webos.notes.selected()).toBeUndefined();
  });

  it('keeps everything, Notes and the selected Note included, when migrating a v6 document (ticket 08 builds) forward', async () => {
    const note = (id: string, body: string, editedAt: number) => ({ id, body, createdAt: at(8, 0).getTime(), editedAt });
    const storage = createMemoryStorage({
      schemaVersion: 6,
      profile: { name: 'Stefan' },
      apps: { notes: { selectedNoteId: 'n1' } },
      linkGroups: [{ id: 'g', name: 'Local', links: [{ id: 'l', title: 'web', url: 'http://localhost:4200' }] }],
      dockedLinkIds: ['l'],
      todos: [{ id: 't', text: 'Ship it', createdAt: at(8, 0).getTime(), completedAt: null }],
      notes: [note('n1', '# Older', at(8, 0).getTime()), note('n2', '# Newer', at(8, 30).getTime())],
    });

    const webos = await createWebOS({ storage, clock: clock() });

    expect(webos.profile.greeting()).toBe('Good morning, Stefan');
    expect(webos.links.docked().map((link) => link.title)).toEqual(['web']);
    expect(webos.todos.open().map((todo) => todo.text)).toEqual(['Ship it']);
    expect(webos.notes.list().map((listed) => listed.title)).toEqual(['Newer', 'Older']);
    expect(webos.notes.selected()?.title).toBe('Older');
    expect(webos.notes.forWidget()?.title).toBe('Newer');
  });

  it('keeps everything when migrating a v7 document (ticket 09 and 10 builds) forward, ending on the Stage layout', async () => {
    const storage = createMemoryStorage({
      schemaVersion: 7,
      profile: { name: 'Stefan' },
      apps: { 'dev-utilities': { activeTab: 'uuid' } },
      linkGroups: [],
      dockedLinkIds: [],
      todos: [{ id: 't', text: 'Ship it', createdAt: at(8, 0).getTime(), completedAt: null }],
      notes: [{ id: 'n', body: '# Pinned', createdAt: at(8, 0).getTime(), editedAt: at(8, 0).getTime() }],
      pinnedNoteId: 'n',
    });

    const webos = await createWebOS({ storage, clock: clock() });

    expect(webos.profile.greeting()).toBe('Good morning, Stefan');
    expect(webos.todos.open().map((todo) => todo.text)).toEqual(['Ship it']);
    expect(webos.notes.forWidget()?.pinned).toBe(true);
    expect(webos.devUtilities.activeTab()).toBe('uuid');
    expect(webos.desktop.layout().map((p) => `${p.widget} ${p.size}@${p.column},${p.row}`)).toEqual([
      'world-clock M@0,0',
      'weather S@3,0',
      'clock M@7,0',
      'calendar S@15,0',
      'sun M@18,0',
      'links M@0,3',
      'todos M@3,3',
      'notes M@6,3',
      'github M@9,3',
      'recent M@18,3',
      'countdown S@9,6',
      'system S@12,6',
      'moon S@15,6',
    ]);
    expect(webos.desktop.hidden()).toEqual([]);
  });

  it('moves a v8 layout (ticket 11 to 14 builds) to the newest Stage layout once, keeping hidden Widgets hidden', async () => {
    const storage = createMemoryStorage({
      schemaVersion: 8,
      profile: { name: 'Stefan' },
      apps: {},
      linkGroups: [],
      dockedLinkIds: [],
      todos: [{ id: 't', text: 'Ship it', createdAt: at(8, 0).getTime(), completedAt: null }],
      notes: [],
      pinnedNoteId: null,
      layout: [
        { widget: 'clock', size: 'S', column: 9, row: 6, visible: true },
        { widget: 'links', size: 'L', column: 0, row: 0, visible: true },
        { widget: 'todos', size: 'M', column: 6, row: 0, visible: true },
        { widget: 'notes', size: 'M', column: 8, row: 4, visible: false },
      ],
    });

    const webos = await createWebOS({ storage, clock: clock() });

    expect(webos.desktop.layout().map((p) => `${p.widget} ${p.size}@${p.column},${p.row}`)).toEqual([
      'world-clock M@0,0',
      'weather S@3,0',
      'clock M@7,0',
      'calendar S@15,0',
      'sun M@18,0',
      'links M@0,3',
      'todos M@3,3',
      'github M@9,3',
      'recent M@18,3',
      'countdown S@9,6',
      'system S@12,6',
      'moon S@15,6',
    ]);
    expect(webos.desktop.hidden()).toEqual(['notes']);
    expect(webos.todos.open().map((todo) => todo.text)).toEqual(['Ship it']);
    expect(await storage.read()).toMatchObject({ schemaVersion: 13, weather: { city: null, report: null } });

    // Once only: a layout changed after the migration stays as it is in the next tab.
    await webos.desktop.resize('clock', 'S');
    const nextTab = await createWebOS({ storage, clock: clock() });
    expect(nextTab.desktop.layout().find((p) => p.widget === 'clock')).toMatchObject({ size: 'S' });
  });

  it('moves a v9 Stage layout (ticket 15 builds) to the newest Stage layout, keeping hidden Widgets hidden', async () => {
    const storage = createMemoryStorage({
      schemaVersion: 9,
      profile: { name: 'Stefan' },
      apps: {},
      linkGroups: [],
      dockedLinkIds: [],
      todos: [],
      notes: [],
      pinnedNoteId: null,
      layout: [
        { widget: 'clock', size: 'L', column: 0, row: 0, visible: true },
        { widget: 'links', size: 'M', column: 0, row: 3, visible: false },
        { widget: 'todos', size: 'M', column: 4, row: 3, visible: true },
        { widget: 'notes', size: 'M', column: 8, row: 3, visible: true },
      ],
    });

    const webos = await createWebOS({ storage, clock: clock() });

    expect(webos.desktop.layout().map((p) => `${p.widget} ${p.size}@${p.column},${p.row}`)).toEqual([
      'world-clock M@0,0',
      'weather S@3,0',
      'clock M@7,0',
      'calendar S@15,0',
      'sun M@18,0',
      'todos M@3,3',
      'notes M@6,3',
      'github M@9,3',
      'recent M@18,3',
      'countdown S@9,6',
      'system S@12,6',
      'moon S@15,6',
    ]);
    expect(webos.desktop.hidden()).toEqual(['links']);
    expect(webos.weather.city()).toBeNull();
  });

  it('moves a v10 layout (ticket 16 builds) to the wide Stage layout once, keeping everything else', async () => {
    const vienna = { name: 'Vienna', region: 'Vienna', country: 'Austria', latitude: 48.2, longitude: 16.37 };
    const storage = createMemoryStorage({
      schemaVersion: 10,
      profile: { name: 'Stefan' },
      apps: {},
      linkGroups: [],
      dockedLinkIds: [],
      todos: [{ id: 't', text: 'Ship it', createdAt: at(8, 0).getTime(), completedAt: null }],
      notes: [],
      pinnedNoteId: null,
      layout: [
        { widget: 'weather', size: 'S', column: 0, row: 0, visible: false },
        { widget: 'clock', size: 'L', column: 0, row: 0, visible: true },
        { widget: 'calendar', size: 'S', column: 9, row: 3, visible: true },
        { widget: 'links', size: 'M', column: 0, row: 3, visible: true },
        { widget: 'todos', size: 'M', column: 4, row: 3, visible: true },
        { widget: 'notes', size: 'M', column: 8, row: 3, visible: false },
      ],
      weather: { city: vienna, report: null },
    });

    const webos = await createWebOS({ storage, clock: clock() });

    expect(webos.desktop.layout().map((p) => `${p.widget} ${p.size}@${p.column},${p.row}`)).toEqual([
      'world-clock M@0,0',
      'clock M@7,0',
      'calendar S@15,0',
      'sun M@18,0',
      'links M@0,3',
      'todos M@3,3',
      'github M@9,3',
      'recent M@18,3',
      'countdown S@9,6',
      'system S@12,6',
      'moon S@15,6',
    ]);
    expect(webos.desktop.hidden()).toEqual(['notes', 'weather']);
    expect(webos.weather.city()).toEqual(vienna);
    expect(webos.todos.open().map((todo) => todo.text)).toEqual(['Ship it']);
    expect(webos.countdowns.list()).toEqual([]);
    expect(webos.worldClock.cities()).toEqual([]);
    expect(webos.github.hasToken()).toBe(false);
    expect(await storage.read()).toMatchObject({ schemaVersion: 13 });
  });

  it('moves a v11 layout (the first build with more Widgets) to the wide Stage layout, showing the new Widgets', async () => {
    const storage = createMemoryStorage({
      schemaVersion: 11,
      profile: { name: 'Stefan' },
      apps: {},
      linkGroups: [],
      dockedLinkIds: [],
      todos: [],
      notes: [],
      pinnedNoteId: null,
      layout: [
        { widget: 'weather', size: 'S', column: 0, row: 0, visible: true },
        { widget: 'clock', size: 'M', column: 3, row: 0, visible: true },
        { widget: 'calendar', size: 'S', column: 9, row: 0, visible: false },
        { widget: 'links', size: 'M', column: 0, row: 3, visible: true },
        { widget: 'todos', size: 'M', column: 3, row: 3, visible: true },
        { widget: 'notes', size: 'M', column: 6, row: 3, visible: true },
        { widget: 'world-clock', size: 'S', column: 9, row: 3, visible: true },
        { widget: 'countdown', size: 'M', column: 9, row: 5, visible: true },
        { widget: 'moon', size: 'S', column: 0, row: 0, visible: false },
        { widget: 'sun', size: 'S', column: 0, row: 0, visible: false },
        { widget: 'recent', size: 'M', column: 0, row: 0, visible: false },
        { widget: 'system', size: 'S', column: 0, row: 0, visible: false },
        { widget: 'github', size: 'S', column: 0, row: 0, visible: false },
      ],
      weather: { city: null, report: null },
      countdowns: [{ id: 'c', title: 'Race', date: '2027-04-18' }],
      worldClocks: [],
      github: { token: 'ghp_kept', contributions: null },
    });

    const webos = await createWebOS({ storage, clock: clock() });

    expect(webos.desktop.layout().map((p) => `${p.widget} ${p.size}@${p.column},${p.row}`)).toEqual([
      'world-clock M@0,0',
      'weather S@3,0',
      'clock M@7,0',
      'sun M@18,0',
      'links M@0,3',
      'todos M@3,3',
      'notes M@6,3',
      'github M@9,3',
      'recent M@18,3',
      'countdown S@9,6',
      'system S@12,6',
      'moon S@15,6',
    ]);
    // Calendar was hidden by the user; the newer Widgets were hidden only for lack of room.
    expect(webos.desktop.hidden()).toEqual(['calendar']);
    expect(webos.countdowns.list().map((countdown) => countdown.title)).toEqual(['Race']);
    expect(webos.github.hasToken()).toBe(true);
  });

  /** A version 12 document with `layout`, the first build with the 21-column Stage. */
  const v12 = (layout: object[]) => ({
    schemaVersion: 12,
    profile: { name: '' },
    apps: {},
    linkGroups: [],
    dockedLinkIds: [],
    todos: [],
    notes: [],
    pinnedNoteId: null,
    layout,
    weather: { city: null, report: null },
    countdowns: [],
    worldClocks: [],
    github: { token: '', contributions: null },
  });

  it('moves a v12 Desktop still on the old Stage to the centred Clock, keeping hidden Widgets hidden', async () => {
    const storage = createMemoryStorage(
      v12([
        { widget: 'world-clock', size: 'M', column: 0, row: 0, visible: true },
        { widget: 'weather', size: 'S', column: 3, row: 0, visible: true },
        { widget: 'clock', size: 'M', column: 6, row: 0, visible: true },
        { widget: 'calendar', size: 'S', column: 12, row: 0, visible: true },
        { widget: 'sun', size: 'M', column: 15, row: 0, visible: false },
        { widget: 'moon', size: 'M', column: 18, row: 0, visible: true },
        { widget: 'links', size: 'M', column: 0, row: 3, visible: true },
        { widget: 'todos', size: 'M', column: 3, row: 3, visible: true },
        { widget: 'notes', size: 'M', column: 6, row: 3, visible: true },
        { widget: 'github', size: 'M', column: 9, row: 3, visible: true },
        { widget: 'recent', size: 'M', column: 18, row: 3, visible: true },
        { widget: 'countdown', size: 'S', column: 9, row: 6, visible: true },
        { widget: 'system', size: 'S', column: 12, row: 6, visible: true },
      ]),
    );

    const webos = await createWebOS({ storage, clock: clock() });

    expect(webos.desktop.layout().map((p) => `${p.widget} ${p.size}@${p.column},${p.row}`)).toEqual([
      'world-clock M@0,0',
      'weather S@3,0',
      'clock M@7,0',
      'calendar S@15,0',
      'links M@0,3',
      'todos M@3,3',
      'notes M@6,3',
      'github M@9,3',
      'recent M@18,3',
      'countdown S@9,6',
      'system S@12,6',
      'moon S@15,6',
    ]);
    expect(webos.desktop.hidden()).toEqual(['sun']);
    expect(await storage.read()).toMatchObject({ schemaVersion: 13 });
  });

  it("keeps a v12 Desktop the user arranged, moving only what the wider Clock now covers", async () => {
    const storage = createMemoryStorage(
      v12([
        { widget: 'weather', size: 'S', column: 0, row: 0, visible: true },
        { widget: 'clock', size: 'M', column: 3, row: 0, visible: true },
        { widget: 'calendar', size: 'S', column: 9, row: 0, visible: true },
        { widget: 'sun', size: 'M', column: 14, row: 0, visible: true },
      ]),
    );

    const webos = await createWebOS({ storage, clock: clock() });

    // The Clock now spans columns 3 to 9, so Calendar moves to the next free place along.
    expect(webos.desktop.layout().map((p) => `${p.widget} ${p.size}@${p.column},${p.row}`)).toEqual([
      'weather S@0,0',
      'clock M@3,0',
      'calendar S@10,0',
      'sun M@14,0',
    ]);
  });

  it.each([
    ['from a newer schema version', { schemaVersion: 99 }],
    ['that is not an object', 'garbage'],
    ['with a non-numeric schema version', { schemaVersion: 'one' }],
    [
      'at the current version but missing its profile',
      {
        schemaVersion: 13,
        apps: {},
        linkGroups: [],
        dockedLinkIds: [],
        todos: [],
        notes: [],
        pinnedNoteId: null,
        layout: [],
        weather: { city: null, report: null },
        countdowns: [],
        worldClocks: [],
        github: { token: '', contributions: null },
      },
    ],
  ])('refuses a document %s and leaves it untouched', async (_, stored) => {
    const storage = createMemoryStorage(stored);

    await expect(createWebOS({ storage, clock: createTestClock(at(9, 0)) })).rejects.toThrow();

    expect(await storage.read()).toEqual(stored);
  });
});
