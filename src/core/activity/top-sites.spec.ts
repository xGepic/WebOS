import { createWebOS, type TopSitePage } from '../index';
import { createMemoryStorage, createTestBrowser, createTestClock } from '../testing';

async function setUp(browser = createTestBrowser()) {
  return createWebOS({ storage: createMemoryStorage(), clock: createTestClock(new Date(2026, 10, 14, 12, 0)), browser });
}

const site = (url: string, title = ''): TopSitePage => ({ url, title });

describe('the Top Sites Widget', () => {
  it('shows nothing until it asks the browser', async () => {
    const webos = await setUp(createTestBrowser({ topSites: [site('https://github.com/', 'GitHub')] }));

    expect(webos.topSites.sites()).toEqual([]);
  });

  it("shows the browser's most visited sites in its order, named by their title", async () => {
    const webos = await setUp(
      createTestBrowser({ topSites: [site('https://github.com/', 'GitHub'), site('https://www.youtube.com/', '  YouTube ')] }),
    );

    await webos.topSites.refresh();

    expect(webos.topSites.sites()).toEqual([
      { title: 'GitHub', url: 'https://github.com/', site: 'github.com' },
      { title: 'YouTube', url: 'https://www.youtube.com/', site: 'youtube.com' },
    ]);
  });

  it('names a site without a title by its address', async () => {
    const webos = await setUp(createTestBrowser({ topSites: [site('https://www.orf.at/', '')] }));

    await webos.topSites.refresh();

    expect(webos.topSites.sites()).toEqual([{ title: 'orf.at', url: 'https://www.orf.at/', site: 'orf.at' }]);
  });

  it('leaves out pages that are not on the web, and repeats', async () => {
    const webos = await setUp(
      createTestBrowser({
        topSites: [
          site('chrome://settings/', 'Settings'),
          site('https://github.com/', 'GitHub'),
          site('chrome-extension://abc/index.html', 'New Tab'),
          site('https://github.com/', 'GitHub again'),
          site('file:///C:/notes.txt', 'notes.txt'),
        ],
      }),
    );

    await webos.topSites.refresh();

    expect(webos.topSites.sites().map((s) => s.title)).toEqual(['GitHub']);
  });

  it('shows at most ten, as many as the Recent Widget', async () => {
    const many = Array.from({ length: 20 }, (_, i) => site(`https://site${i}.example/`, `Site ${i}`));
    const webos = await setUp(createTestBrowser({ topSites: many }));

    await webos.topSites.refresh();

    expect(webos.topSites.sites()).toHaveLength(10);
    expect(webos.topSites.sites().at(-1)?.title).toBe('Site 9');
  });

  it('follows the browser when asked again, and keeps the sites it had when asking fails', async () => {
    let answer: () => TopSitePage[] = () => [site('https://github.com/', 'GitHub')];
    const webos = await setUp(createTestBrowser({ topSites: () => answer() }));
    await webos.topSites.refresh();

    answer = () => [site('https://orf.at/', 'ORF'), site('https://github.com/', 'GitHub')];
    await webos.topSites.refresh();
    expect(webos.topSites.sites().map((s) => s.title)).toEqual(['ORF', 'GitHub']);

    answer = () => {
      throw new Error('No access');
    };
    await webos.topSites.refresh();
    expect(webos.topSites.sites().map((s) => s.title)).toEqual(['ORF', 'GitHub']);
  });

  it('shows nothing without the browser, as outside the extension', async () => {
    const webos = await createWebOS({ storage: createMemoryStorage(), clock: createTestClock(new Date(2026, 10, 14, 12, 0)) });

    await webos.topSites.refresh();

    expect(webos.topSites.sites()).toEqual([]);
  });
});
