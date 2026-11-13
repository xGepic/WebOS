import { FetchError, createWebOS } from '../index';
import { createMemoryStorage, createTestClock, createTestFetch, type TestFetch } from '../testing';

const MINUTE = 60_000;
const NOW = new Date(2026, 10, 12, 18, 0);

/** A GraphQL answer with one contribution day per `counts` entry, the last one today (Nov 12, 2026). */
function graph(counts: number[], { login = 'stefan', total }: { login?: string; total?: number } = {}) {
  const days = counts.map((count, i) => {
    const date = new Date(Date.UTC(2026, 10, 12 - (counts.length - 1 - i)));
    const level = count === 0 ? 'NONE' : count < 3 ? 'FIRST_QUARTILE' : count < 6 ? 'SECOND_QUARTILE' : 'FOURTH_QUARTILE';
    return { date: date.toISOString().slice(0, 10), contributionCount: count, contributionLevel: level };
  });
  // GitHub groups days into weeks starting on Sunday.
  const weeks: { contributionDays: typeof days }[] = [];
  for (const day of days) {
    if (!weeks.length || new Date(`${day.date}T00:00:00Z`).getUTCDay() === 0) weeks.push({ contributionDays: [] });
    weeks[weeks.length - 1].contributionDays.push(day);
  }
  return {
    data: {
      viewer: {
        login,
        contributionsCollection: {
          contributionCalendar: { totalContributions: total ?? counts.reduce((a, b) => a + b, 0), weeks },
        },
      },
    },
  };
}

async function setUp({ respond = (): unknown => graph([1, 2, 0, 3]), storage = createMemoryStorage(), clock = createTestClock(NOW) } = {}) {
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

  it("fetches the token owner's contribution graph with the token", async () => {
    const { webos, fetch } = await setUp();

    await webos.github.setToken('  ghp_secret  ');
    await settle();

    expect(webos.github.hasToken()).toBe(true);
    expect(gitHubRequests(fetch).map(String)).toEqual(['https://api.github.com/graphql']);
    expect(fetch.sent[0]).toMatchObject({ method: 'POST', headers: { Authorization: 'bearer ghp_secret' } });
    expect((fetch.sent[0].body as { query: string }).query).toContain('contributionCalendar');
    expect(webos.github.view()).toMatchObject({ status: 'ready', login: 'stefan', total: '6' });
  });

  it('draws the days in weeks from Sunday to Saturday, as GitHub does', async () => {
    // Nov 12, 2026 is a Thursday: the 9 days up to it start on Wednesday, Nov 4.
    const { webos } = await setUp({ respond: () => graph([1, 0, 2, 0, 3, 4, 5, 6, 7]) });
    await webos.github.setToken('ghp_secret');
    await settle();

    const view = webos.github.view();
    expect(view.status === 'ready' && view.weeks.map((week) => week.map((day) => day?.count ?? null))).toEqual([
      [null, null, null, 1, 0, 2, 0],
      [3, 4, 5, 6, 7, null, null],
    ]);
    expect(view.status === 'ready' && view.weeks[1][4]).toEqual({ date: '2026-11-12', count: 7, level: 4 });
  });

  it('counts the current and longest streaks, and today only breaks one once it is over', async () => {
    const withToday = await setUp({ respond: () => graph([2, 2, 2, 0, 1, 1, 1]) });
    await withToday.webos.github.setToken('ghp_secret');
    await settle();
    expect(withToday.webos.github.view()).toMatchObject({ currentStreak: 3, longestStreak: 3 });

    const notYetToday = await setUp({ respond: () => graph([1, 1, 1, 1, 0, 1, 1, 0]) });
    await notYetToday.webos.github.setToken('ghp_secret');
    await settle();
    expect(notYetToday.webos.github.view()).toMatchObject({ currentStreak: 2, longestStreak: 4 });
  });

  it('shows the stored graph at once in a new tab, and fetches it again only once it is an hour old', async () => {
    const { webos, storage, clock, fetch } = await setUp();
    await webos.github.setToken('ghp_secret');
    await settle();

    clock.advance(59 * MINUTE);
    const nextTab = await setUp({ storage, clock });
    expect(nextTab.webos.github.view()).toMatchObject({ status: 'ready', total: '6' });
    await settle();
    expect(gitHubRequests(nextTab.fetch)).toHaveLength(0);

    clock.advance(MINUTE);
    const later = await setUp({ storage, clock });
    await settle();
    expect(gitHubRequests(later.fetch)).toHaveLength(1);
    expect(gitHubRequests(fetch)).toHaveLength(1);
  });

  it('says when GitHub refuses the token', async () => {
    const { webos } = await setUp({
      respond: () => {
        throw new FetchError(401);
      },
    });

    await webos.github.setToken('ghp_wrong');
    await settle();

    expect(webos.github.view()).toEqual({ status: 'failed', problem: 'token' });
  });

  it('keeps the last graph when a fetch fails, saying when it is from once it is old', async () => {
    let online = true;
    const { webos, storage, clock } = await setUp({
      respond: () => {
        if (!online) throw new Error('offline');
        return graph([1, 2, 0, 3]);
      },
    });
    await webos.github.setToken('ghp_secret');
    await settle();

    online = false;
    clock.advance(3 * 60 * MINUTE);
    const nextTab = await createWebOS({
      storage,
      clock,
      fetch: createTestFetch(() => {
        throw new Error('offline');
      }),
    });
    await settle();

    expect(nextTab.github.view()).toMatchObject({ status: 'ready', total: '6', problem: 'unavailable', updatedAt: '6:00 PM' });
  });

  it('drops the graph when the token is removed', async () => {
    const { webos, fetch } = await setUp({ respond: () => graph([1], { login: 'other' }) });
    await webos.github.setToken('ghp_first');
    await settle();

    await webos.github.setToken('');

    expect(webos.github.hasToken()).toBe(false);
    expect(webos.github.view()).toEqual({ status: 'no-token' });
    expect(gitHubRequests(fetch)).toHaveLength(1);
  });

  it('rejects an answer with GraphQL errors', async () => {
    const { webos } = await setUp({ respond: () => ({ errors: [{ message: 'Something went wrong' }] }) });

    await webos.github.setToken('ghp_secret');
    await settle();

    expect(webos.github.view()).toEqual({ status: 'failed', problem: 'unavailable' });
  });

  it('leaves the token and the graph out of a backup, and keeps this machine’s token on import', async () => {
    const { webos } = await setUp();
    await webos.github.setToken('ghp_secret');
    await settle();

    const exported = webos.backup.export().text;
    expect(exported).not.toContain('ghp_secret');
    expect(JSON.parse(exported).github).toEqual({ token: '', contributions: null });

    const other = await setUp();
    await other.webos.github.setToken('ghp_other_machine');
    await settle();
    await other.webos.backup.import(exported);
    await settle();

    expect(other.webos.github.hasToken()).toBe(true);
    expect(other.fetch.sent.at(-1)).toMatchObject({ headers: { Authorization: 'bearer ghp_other_machine' } });
  });
});
