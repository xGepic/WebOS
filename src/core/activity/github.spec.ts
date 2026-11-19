import { FetchError, createWebOS } from '../index';
import { createMemoryStorage, createTestClock, createTestFetch, type TestFetch } from '../testing';

const MINUTE = 60_000;
const NOW = new Date(2026, 10, 19, 18, 0);

/** A GraphQL answer with the commits this month and last month. */
const answer = (thisMonth: number, lastMonth: number, login = 'stefan') => ({
  data: { viewer: { login, thisMonth: { totalCommitContributions: thisMonth }, lastMonth: { totalCommitContributions: lastMonth } } },
});

async function setUp({ respond = (): unknown => answer(42, 97), storage = createMemoryStorage(), clock = createTestClock(NOW) } = {}) {
  const fetch = createTestFetch(() => respond());
  const webos = await createWebOS({ storage, clock, fetch });
  return { webos, fetch, storage, clock };
}

/** Lets fetches started in the background finish. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const gitHubRequests = (fetch: TestFetch) => fetch.requests.filter((url) => url.hostname === 'api.github.com');

describe('the GitHub Widget', () => {
  it('asks for a token without one, and fetches nothing', async () => {
    const { webos, fetch } = await setUp();

    expect(webos.github.hasToken()).toBe(false);
    expect(webos.github.view()).toEqual({ status: 'no-token' });
    expect(fetch.requests).toEqual([]);
  });

  it("fetches the token owner's commits this month and last month with the token", async () => {
    const { webos, fetch } = await setUp();

    await webos.github.setToken('  ghp_secret  ');
    expect(webos.github.view()).toEqual({ status: 'loading' });
    await settle();

    expect(webos.github.hasToken()).toBe(true);
    expect(gitHubRequests(fetch).map(String)).toEqual(['https://api.github.com/graphql']);
    expect(fetch.sent[0]).toMatchObject({ method: 'POST', headers: { Authorization: 'bearer ghp_secret' } });
    expect((fetch.sent[0].body as { query: string }).query).toContain('totalCommitContributions');
    expect(webos.github.view()).toEqual({ status: 'ready', login: 'stefan', thisMonth: 42, lastMonth: 97 });
  });

  it('asks for this month from its first local midnight to now, and for all of last month', async () => {
    const { webos, fetch } = await setUp();

    await webos.github.setToken('ghp_secret');
    await settle();

    expect((fetch.sent[0].body as { variables: unknown }).variables).toEqual({
      thisMonth: new Date(2026, 10, 1).toISOString(),
      now: NOW.toISOString(),
      lastMonth: new Date(2026, 9, 1).toISOString(),
      lastMonthEnd: new Date(new Date(2026, 10, 1).getTime() - 1).toISOString(),
    });
  });

  it('takes last month from the year before in January', async () => {
    const { webos, fetch } = await setUp({ clock: createTestClock(new Date(2027, 0, 5, 9, 0)) });

    await webos.github.setToken('ghp_secret');
    await settle();

    expect((fetch.sent[0].body as { variables: { lastMonth: string } }).variables.lastMonth).toBe(new Date(2026, 11, 1).toISOString());
  });

  it('keeps the counts for an hour, then fetches them again', async () => {
    const storage = createMemoryStorage();
    const first = await setUp({ storage });
    await first.webos.github.setToken('ghp_secret');
    await settle();

    const soon = createTestClock(new Date(NOW.getTime() + 59 * MINUTE));
    const nextTab = await setUp({ storage: storage.openTab(), clock: soon, respond: () => answer(43, 97) });
    await settle();
    expect(gitHubRequests(nextTab.fetch)).toEqual([]);
    expect(nextTab.webos.github.view()).toMatchObject({ thisMonth: 42 });

    soon.advance(MINUTE);
    await nextTab.webos.github.refresh();
    expect(gitHubRequests(nextTab.fetch)).toHaveLength(1);
    expect(nextTab.webos.github.view()).toMatchObject({ thisMonth: 43 });
  });

  it("doesn't show last month's counts as this month's once the month turns", async () => {
    const storage = createMemoryStorage();
    const first = await setUp({ storage, clock: createTestClock(new Date(2026, 10, 30, 23, 50)) });
    await first.webos.github.setToken('ghp_secret');
    await settle();

    const december = createTestClock(new Date(2026, 11, 1, 0, 10));
    const nextTab = await setUp({ storage: storage.openTab(), clock: december, respond: () => new Promise(() => {}) });

    expect(nextTab.webos.github.view()).toEqual({ status: 'loading' });
    expect(gitHubRequests(nextTab.fetch)).toHaveLength(1);
  });

  it('says when the counts are from once they are over two hours old', async () => {
    const storage = createMemoryStorage();
    const first = await setUp({ storage });
    await first.webos.github.setToken('ghp_secret');
    await settle();

    const later = await setUp({
      storage: storage.openTab(),
      clock: createTestClock(new Date(NOW.getTime() + 121 * MINUTE)),
      respond: () => Promise.reject(new Error('offline')),
    });
    await settle();

    expect(later.webos.github.view()).toMatchObject({ status: 'ready', thisMonth: 42, updatedAt: '6:00 PM', problem: 'unavailable' });
  });

  it('says when GitHub refuses the token', async () => {
    const { webos } = await setUp({ respond: () => Promise.reject(new FetchError(401)) });

    await webos.github.setToken('ghp_wrong');
    await settle();

    expect(webos.github.view()).toEqual({ status: 'failed', problem: 'token' });
  });

  it("treats an answer with errors, or one it can't read, as GitHub being unavailable", async () => {
    for (const response of [{ errors: [{ message: 'Something went wrong' }] }, { data: { viewer: { login: 'stefan' } } }]) {
      const { webos } = await setUp({ respond: () => response });

      await webos.github.setToken('ghp_secret');
      await settle();

      expect(webos.github.view()).toEqual({ status: 'failed', problem: 'unavailable' });
    }
  });

  it("removes the token and the old token's counts", async () => {
    const { webos, storage } = await setUp();
    await webos.github.setToken('ghp_secret');
    await settle();

    await webos.github.setToken('');

    expect(webos.github.hasToken()).toBe(false);
    expect(webos.github.view()).toEqual({ status: 'no-token' });
    expect(await storage.read()).toMatchObject({ github: { token: '', commits: null } });
  });

  it('leaves the token and the counts out of backups, and keeps this machine’s token on import', async () => {
    const original = await setUp();
    await original.webos.github.setToken('ghp_secret');
    await settle();
    const file = original.webos.backup.export().text;
    expect(file).not.toContain('ghp_secret');

    const other = await setUp({ respond: () => answer(5, 6, 'other') });
    await other.webos.github.setToken('ghp_mine');
    await settle();
    await other.webos.backup.import(file);
    await settle();

    expect(other.webos.github.hasToken()).toBe(true);
    expect(other.fetch.sent.at(-1)).toMatchObject({ headers: { Authorization: 'bearer ghp_mine' } });
    expect(gitHubRequests(other.fetch)).toHaveLength(2);
  });

  it('starts hidden on a Desktop from before it, without a token, dropping what the old GitHub Widget left in the layout', async () => {
    const { storage } = await setUp();
    const { github: _, ...v28 } = (await storage.read()) as Record<string, unknown> & { layout: unknown[] };
    const oldEntry = { widget: 'github', size: 'M', column: 9, row: 3, visible: true };

    const migrated = await setUp({ storage: createMemoryStorage({ ...v28, schemaVersion: 28, layout: [...v28.layout, oldEntry] }) });

    expect(migrated.webos.desktop.hidden()).toContain('github');
    expect(migrated.webos.github.view()).toEqual({ status: 'no-token' });
    expect(await migrated.storage.read()).toMatchObject({ schemaVersion: 29, github: { token: '', commits: null } });
  });
});
