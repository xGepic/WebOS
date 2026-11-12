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

  it.each([
    ['from a newer schema version', { schemaVersion: 99 }],
    ['that is not an object', 'garbage'],
    ['with a non-numeric schema version', { schemaVersion: 'one' }],
    ['at the current version but missing its profile', { schemaVersion: 2, apps: {} }],
  ])('refuses a document %s and leaves it untouched', async (_, stored) => {
    const storage = createMemoryStorage(stored);

    await expect(createWebOS({ storage, clock: createTestClock(at(9, 0)) })).rejects.toThrow();

    expect(await storage.read()).toEqual(stored);
  });
});
