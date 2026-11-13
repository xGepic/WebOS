import { createWebOS, type BrowserLookup, type VisitedPage } from '../index';
import { createMemoryStorage, createTestBrowser, createTestClock } from '../testing';

const NOW = new Date(2026, 10, 12, 15, 0);
const MINUTE = 60_000;
const ago = (minutes: number) => NOW.getTime() - minutes * MINUTE;
const page = (title: string, url: string, minutesAgo: number): VisitedPage => ({ title, url, visitedAt: ago(minutesAgo) });

async function setUp(browser: BrowserLookup = createTestBrowser()) {
  const clock = createTestClock(NOW);
  return { webos: await createWebOS({ storage: createMemoryStorage(), clock, browser }), clock };
}

describe('the Recent Widget', () => {
  it('lists the pages visited last, latest first, with when', async () => {
    const { webos } = await setUp(
      createTestBrowser({
        history: [
          page('Pull requests', 'https://github.com/pulls', 0),
          page('Angular signals', 'https://angular.dev/guide/signals', 12),
          page('', 'https://www.example.com/path', 3 * 60 + 5),
          page('Yesterday’s page', 'https://news.ycombinator.com/', 18 * 60),
          page('Older', 'https://developer.mozilla.org/', 3 * 24 * 60),
        ],
      }),
    );

    await webos.recent.refresh();

    expect(webos.recent.pages()).toEqual([
      { title: 'Pull requests', url: 'https://github.com/pulls', site: 'github.com', when: 'Just now' },
      { title: 'Angular signals', url: 'https://angular.dev/guide/signals', site: 'angular.dev', when: '12 min ago' },
      { title: 'example.com', url: 'https://www.example.com/path', site: 'example.com', when: '3 h ago' },
      { title: 'Yesterday’s page', url: 'https://news.ycombinator.com/', site: 'news.ycombinator.com', when: 'Yesterday' },
      { title: 'Older', url: 'https://developer.mozilla.org/', site: 'developer.mozilla.org', when: 'Nov 9' },
    ]);
  });

  it('leaves out pages that aren’t on the web, and lists each page once, at most ten', async () => {
    const history = [
      page('New Tab', 'chrome-extension://abc/index.html', 0),
      page('Settings', 'chrome://settings/', 1),
      page('Docs', 'https://angular.dev/', 2),
      page('Docs again', 'https://angular.dev/', 3),
      ...Array.from({ length: 20 }, (_, i) => page(`Page ${i}`, `https://example.com/${i}`, 10 + i)),
    ];
    const { webos } = await setUp(createTestBrowser({ history }));

    await webos.recent.refresh();

    const pages = webos.recent.pages();
    expect(pages).toHaveLength(10);
    expect(pages.slice(0, 2).map((shown) => shown.title)).toEqual(['Docs', 'Page 0']);
  });

  it('shows nothing before the first refresh, and keeps what it had when the browser fails', async () => {
    let fail = false;
    const browser = createTestBrowser({ history: [page('Docs', 'https://angular.dev/', 2)] });
    const { webos } = await setUp({ ...browser, recent: (count) => (fail ? Promise.reject(new Error('no access')) : browser.recent(count)) });
    expect(webos.recent.pages()).toEqual([]);

    await webos.recent.refresh();
    fail = true;
    await webos.recent.refresh();

    expect(webos.recent.pages().map((shown) => shown.title)).toEqual(['Docs']);
  });

  it('updates when it was visited as time goes by', async () => {
    const { webos, clock } = await setUp(createTestBrowser({ history: [page('Docs', 'https://angular.dev/', 0)] }));
    await webos.recent.refresh();

    clock.advance(5 * MINUTE);

    expect(webos.recent.pages()[0].when).toBe('5 min ago');
  });
});
