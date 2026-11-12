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

// The document holds no user-visible state yet, so these tests can only observe it
// through the injected Storage edge. Once Profile and Backup land, migration tests
// should assert through their public state instead.
describe('state document', () => {
  const schemaVersionOf = async (storage: { read(): Promise<unknown> }) =>
    ((await storage.read()) as { schemaVersion?: unknown } | undefined)?.schemaVersion;

  it('starts a fresh document at schema version 1 when nothing is stored', async () => {
    const storage = createMemoryStorage();

    await createWebOS({ storage, clock: createTestClock(at(9, 0)) });

    expect(await schemaVersionOf(storage)).toBe(1);
  });

  it('migrates an unversioned v0 document forward to v1 on load', async () => {
    const storage = createMemoryStorage({});

    await createWebOS({ storage, clock: createTestClock(at(9, 0)) });

    expect(await schemaVersionOf(storage)).toBe(1);
  });

  it.each([
    ['from a newer schema version', { schemaVersion: 99 }],
    ['that is not an object', 'garbage'],
    ['with a non-numeric schema version', { schemaVersion: 'one' }],
  ])('refuses a document %s and leaves it untouched', async (_, stored) => {
    const storage = createMemoryStorage(stored);

    await expect(createWebOS({ storage, clock: createTestClock(at(9, 0)) })).rejects.toThrow();

    expect(await storage.read()).toEqual(stored);
  });
});
