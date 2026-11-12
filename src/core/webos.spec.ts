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

  it.each([
    ['from a newer schema version', { schemaVersion: 99 }],
    ['that is not an object', 'garbage'],
    ['with a non-numeric schema version', { schemaVersion: 'one' }],
    ['at the current version but missing its profile', { schemaVersion: 7, apps: {}, linkGroups: [], dockedLinkIds: [], todos: [], notes: [], pinnedNoteId: null }],
  ])('refuses a document %s and leaves it untouched', async (_, stored) => {
    const storage = createMemoryStorage(stored);

    await expect(createWebOS({ storage, clock: createTestClock(at(9, 0)) })).rejects.toThrow();

    expect(await storage.read()).toEqual(stored);
  });
});
