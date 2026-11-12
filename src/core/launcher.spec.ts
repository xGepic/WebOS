import { createWebOS } from './index';
import { createMemoryStorage, createTestClock } from './testing';

async function webosWith() {
  return createWebOS({ storage: createMemoryStorage(), clock: createTestClock(new Date(2026, 10, 12, 9, 0)) });
}

/** What the Launcher lists, top to bottom. */
const titles = (results: readonly { title: string }[]) => results.map((result) => result.title);

describe('Launcher', () => {
  it('ends with a Brave search for what was typed', async () => {
    const webos = await webosWith();

    const results = webos.launcher.search('angular signals');

    expect(results.at(-1)).toEqual({
      kind: 'web',
      id: 'web',
      title: 'Search Brave for "angular signals"',
      url: 'https://search.brave.com/search?q=angular%20signals',
    });
  });

  it('searches Brave for exactly what was typed, symbols included', async () => {
    const webos = await webosWith();

    expect(webos.launcher.search('c++ & rust?').at(-1)).toMatchObject({
      url: 'https://search.brave.com/search?q=c%2B%2B%20%26%20rust%3F',
    });
  });

  it('finds an App by its name, ignoring case', async () => {
    const webos = await webosWith();

    expect(webos.launcher.search('NOT')).toEqual([
      { kind: 'app', id: 'app:notes', title: 'Notes', app: 'notes' },
      expect.objectContaining({ kind: 'web' }),
    ]);
  });

  it('finds Links, after Apps', async () => {
    const webos = await webosWith();
    const group = await webos.links.addGroup('Local');
    const link = await webos.links.addLink(group, { title: 'Settings service', url: 'localhost:8081' });

    expect(webos.launcher.search('settings')).toEqual([
      { kind: 'app', id: 'app:settings', title: 'Settings', app: 'settings' },
      { kind: 'link', id: `link:${link}`, title: 'Settings service', url: 'http://localhost:8081' },
      expect.objectContaining({ kind: 'web' }),
    ]);
  });

  it('ranks a kind by match: start of the name, then start of a word, then anywhere', async () => {
    const webos = await webosWith();
    const group = await webos.links.addGroup('Dev');
    for (const title of ['Rapid deploy', 'Staging API', 'Grafana', 'API gateway', 'Mapping'])
      await webos.links.addLink(group, { title, url: 'example.com' });

    expect(titles(webos.launcher.search('api'))).toEqual(['API gateway', 'Staging API', 'Rapid deploy', 'Search Brave for "api"']);
  });

  it('counts a word start even when the query also appears earlier inside a word', async () => {
    const webos = await webosWith();
    const group = await webos.links.addGroup('Dev');
    await webos.links.addLink(group, { title: 'Grapefruit', url: 'example.com' });
    await webos.links.addLink(group, { title: 'Grapefruit app', url: 'example.com' });
    await webos.links.addLink(group, { title: 'my-app', url: 'example.com' });

    expect(titles(webos.launcher.search('app'))).toEqual(['Grapefruit app', 'my-app', 'Search Brave for "app"']);
  });

  it('ignores spaces around the query', async () => {
    const webos = await webosWith();

    expect(titles(webos.launcher.search('  notes '))).toEqual(['Notes', 'Search Brave for "notes"']);
  });

  it('keeps display order between equally good matches', async () => {
    const webos = await webosWith();
    const local = await webos.links.addGroup('Local');
    await webos.links.addLink(local, { title: 'web staging', url: 'localhost:4200' });
    await webos.links.addLink(local, { title: 'api staging', url: 'localhost:8080' });
    const remote = await webos.links.addGroup('Remote');
    await webos.links.addLink(remote, { title: 'docs staging', url: 'docs.example.com' });

    expect(titles(webos.launcher.search('stag'))).toEqual(['web staging', 'api staging', 'docs staging', 'Search Brave for "stag"']);
  });

  it('puts every App before every Link, however well the Link matches', async () => {
    const webos = await webosWith();
    const group = await webos.links.addGroup('Dev');
    await webos.links.addLink(group, { title: 'Utilities box', url: 'example.com' });

    expect(titles(webos.launcher.search('ut'))).toEqual(['Dev Utilities', 'Utilities box', 'Search Brave for "ut"']);
  });

  it.each(['', '   '])('finds nothing, not even a web search, for the empty query "%s"', async (query) => {
    const webos = await webosWith();

    expect(webos.launcher.search(query)).toEqual([]);
  });
});
