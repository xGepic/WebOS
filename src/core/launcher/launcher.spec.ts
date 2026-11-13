import { createWebOS, type BrowserPage, type VisitedPage } from '../index';
import { createMemoryStorage, createTestBrowser, createTestClock } from '../testing';

async function webosWith() {
  return createWebOS({ storage: createMemoryStorage(), clock: createTestClock(new Date(2026, 10, 12, 9, 0)) });
}

async function webosWithBrowser(pages: { bookmarks?: BrowserPage[]; history?: VisitedPage[] }) {
  return createWebOS({
    storage: createMemoryStorage(),
    clock: createTestClock(new Date(2026, 10, 12, 9, 0)),
    browser: createTestBrowser(pages),
  });
}

/** A page visited `daysAgo` days before the tests' 9:00 AM, Nov 12. */
const visited = (title: string, url: string, daysAgo = 0): VisitedPage => ({
  title,
  url,
  visitedAt: new Date(2026, 10, 12 - daysAgo, 8, 0).getTime(),
});

/** What the Launcher lists, top to bottom. */
const titles = (results: readonly { title: string }[]) => results.map((result) => result.title);

describe('Launcher', () => {
  it('ends with a DuckDuckGo search for what was typed', async () => {
    const webos = await webosWith();

    const results = await webos.launcher.search('angular signals');

    expect(results.at(-1)).toEqual({
      kind: 'web',
      id: 'web',
      title: 'Search DuckDuckGo for "angular signals"',
      url: 'https://duckduckgo.com/?q=angular%20signals',
    });
  });

  it('searches DuckDuckGo for exactly what was typed, symbols included', async () => {
    const webos = await webosWith();

    expect((await webos.launcher.search('c++ & rust?')).at(-1)).toMatchObject({
      url: 'https://duckduckgo.com/?q=c%2B%2B%20%26%20rust%3F',
    });
  });

  it('finds an App by its name, ignoring case', async () => {
    const webos = await webosWith();

    expect(await webos.launcher.search('NOT')).toEqual([
      { kind: 'app', id: 'app:notes', title: 'Notes', app: 'notes' },
      expect.objectContaining({ kind: 'web' }),
    ]);
  });

  it('finds the Apps that have no Dock icon, such as Countdowns and World Clock', async () => {
    const webos = await webosWith();

    expect(webos.apps.filter((app) => !app.docked).map((app) => app.id)).toEqual(['notes', 'countdowns', 'world-clock']);
    expect(await webos.launcher.search('countdown')).toEqual([
      { kind: 'app', id: 'app:countdowns', title: 'Countdowns', app: 'countdowns' },
      expect.objectContaining({ kind: 'web' }),
    ]);
    expect(await webos.launcher.search('world')).toEqual([
      { kind: 'app', id: 'app:world-clock', title: 'World Clock', app: 'world-clock' },
      expect.objectContaining({ kind: 'web' }),
    ]);
  });

  it('finds Links, after Apps', async () => {
    const webos = await webosWith();
    const group = await webos.links.addGroup('Local');
    const link = await webos.links.addLink(group, { title: 'Settings service', url: 'localhost:8081' });

    expect(await webos.launcher.search('settings')).toEqual([
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

    expect(titles(await webos.launcher.search('api'))).toEqual(['API gateway', 'Staging API', 'Rapid deploy', 'Search DuckDuckGo for "api"']);
  });

  it('counts a word start even when the query also appears earlier inside a word', async () => {
    const webos = await webosWith();
    const group = await webos.links.addGroup('Dev');
    await webos.links.addLink(group, { title: 'Grapefruit', url: 'example.com' });
    await webos.links.addLink(group, { title: 'Grapefruit app', url: 'example.com' });
    await webos.links.addLink(group, { title: 'my-app', url: 'example.com' });

    expect(titles(await webos.launcher.search('app'))).toEqual(['Grapefruit app', 'my-app', 'Search DuckDuckGo for "app"']);
  });

  it('ignores spaces around the query', async () => {
    const webos = await webosWith();

    expect(titles(await webos.launcher.search('  notes '))).toEqual(['Notes', 'Search DuckDuckGo for "notes"']);
  });

  it('keeps display order between equally good matches', async () => {
    const webos = await webosWith();
    const local = await webos.links.addGroup('Local');
    await webos.links.addLink(local, { title: 'web staging', url: 'localhost:4200' });
    await webos.links.addLink(local, { title: 'api staging', url: 'localhost:8080' });
    const remote = await webos.links.addGroup('Remote');
    await webos.links.addLink(remote, { title: 'docs staging', url: 'docs.example.com' });

    expect(titles(await webos.launcher.search('stag'))).toEqual(['web staging', 'api staging', 'docs staging', 'Search DuckDuckGo for "stag"']);
  });

  it('puts every App before every Link, however well the Link matches', async () => {
    const webos = await webosWith();
    const group = await webos.links.addGroup('Dev');
    await webos.links.addLink(group, { title: 'Utilities box', url: 'example.com' });

    expect(titles(await webos.launcher.search('ut'))).toEqual(['Dev Utilities', 'Utilities box', 'Search DuckDuckGo for "ut"']);
  });

  it('finds open Todos after Links', async () => {
    const webos = await webosWith();
    const group = await webos.links.addGroup('Dev');
    await webos.links.addLink(group, { title: 'Deploy dashboard', url: 'deploy.example.com' });
    const todo = await webos.todos.add('Deploy the API');
    const done = await webos.todos.add('Deploy the docs');
    await webos.todos.complete(done!);

    expect(await webos.launcher.search('deploy')).toEqual([
      expect.objectContaining({ kind: 'link', title: 'Deploy dashboard' }),
      { kind: 'todo', id: `todo:${todo}`, title: 'Deploy the API', todoId: todo },
      expect.objectContaining({ kind: 'web' }),
    ]);
  });

  it('ranks Todos and Notes together by match, Todos first and then the most recently edited Notes between equals', async () => {
    const clock = createTestClock(new Date(2026, 10, 12, 9, 0));
    const webos = await createWebOS({ storage: createMemoryStorage(), clock });
    await webos.todos.add('Draft release email');
    await webos.notes.create('# Release checklist\n\n- tag');
    clock.advance(60_000);
    await webos.notes.create('Weekly sync\n\nWe talked about the release.');
    clock.advance(60_000);
    await webos.notes.create('Release party ideas');
    await webos.todos.add('Release the beta');

    expect(titles(await webos.launcher.search('release'))).toEqual([
      'Release the beta',
      'Release party ideas',
      'Release checklist',
      'Draft release email',
      'Weekly sync',
      'Search DuckDuckGo for "release"',
    ]);
  });

  it('shows when a Note was last edited', async () => {
    const webos = await webosWith();
    const note = await webos.notes.create('Ideas');

    expect(await webos.launcher.search('ideas')).toContainEqual({
      kind: 'note',
      id: `note:${note}`,
      title: 'Ideas',
      noteId: note,
      detail: '9:00 AM',
    });
  });

  it('finds bookmarks, then history, after Todos and Notes', async () => {
    const webos = await webosWithBrowser({
      bookmarks: [{ title: 'Angular docs', url: 'https://angular.dev' }],
      history: [visited('Angular blog', 'https://blog.angular.dev')],
    });
    await webos.todos.add('Upgrade Angular');

    expect(await webos.launcher.search('angular')).toEqual([
      expect.objectContaining({ kind: 'todo', title: 'Upgrade Angular' }),
      { kind: 'bookmark', id: 'bookmark:https://angular.dev', title: 'Angular docs', url: 'https://angular.dev' },
      { kind: 'history', id: 'history:https://blog.angular.dev', title: 'Angular blog', url: 'https://blog.angular.dev' },
      expect.objectContaining({ kind: 'web' }),
    ]);
  });

  it('shows at most 3 bookmarks and 3 history entries, so they never crowd out your own things', async () => {
    const pages = [1, 2, 3, 4, 5].map((n) => ({ title: `Rust page ${n}`, url: `https://rust.example/${n}` }));
    const webos = await webosWithBrowser({ bookmarks: pages, history: pages.map((page) => visited(page.title, `${page.url}/seen`)) });

    const results = await webos.launcher.search('rust');

    expect(results.filter((result) => result.kind === 'bookmark')).toHaveLength(3);
    expect(results.filter((result) => result.kind === 'history')).toHaveLength(3);
  });

  it('ranks history by match, then the most recently visited first', async () => {
    const webos = await webosWithBrowser({
      history: [
        visited('An old react page', 'https://old.example', 1),
        visited('React docs', 'https://react.dev', 3),
        visited('React blog', 'https://react.dev/blog', 0),
      ],
    });

    expect(titles(await webos.launcher.search('react'))).toEqual(['React blog', 'React docs', 'An old react page', 'Search DuckDuckGo for "react"']);
  });

  it('titles an untitled page by its URL, and ranks a page found only by its URL below pages whose title matches', async () => {
    const webos = await webosWithBrowser({
      bookmarks: [
        { title: 'Docs', url: 'https://svelte.dev/docs' },
        { title: '', url: 'https://svelte.dev/repl' },
        { title: 'Svelte tutorial', url: 'https://learn.example/svelte' },
      ],
    });

    expect(titles(await webos.launcher.search('svelte'))).toEqual([
      'Svelte tutorial',
      'https://svelte.dev/repl',
      'Docs',
      'Search DuckDuckGo for "svelte"',
    ]);
  });

  it('still finds your own things when the browser lookup fails', async () => {
    const webos = await createWebOS({
      storage: createMemoryStorage(),
      clock: createTestClock(new Date(2026, 10, 12, 9, 0)),
      browser: {
        bookmarks: () => Promise.reject(new Error('no access')),
        history: () => Promise.reject(new Error('no access')),
        recent: () => Promise.reject(new Error('no access')),
      },
    });

    expect(titles(await webos.launcher.search('notes'))).toEqual(['Notes', 'Search DuckDuckGo for "notes"']);
  });

  it('shows a page once, as the Link or bookmark it already is', async () => {
    const webos = await webosWithBrowser({
      bookmarks: [{ title: 'GitHub', url: 'https://github.com/' }, { title: 'GitHub issues', url: 'https://github.com/issues' }],
      history: [visited('GitHub', 'https://github.com/'), visited('GitHub issues', 'https://github.com/issues')],
    });
    const group = await webos.links.addGroup('Dev');
    await webos.links.addLink(group, { title: 'GitHub', url: 'github.com' });

    expect(await webos.launcher.search('github')).toEqual([
      expect.objectContaining({ kind: 'link', title: 'GitHub' }),
      expect.objectContaining({ kind: 'bookmark', title: 'GitHub issues' }),
      expect.objectContaining({ kind: 'web' }),
    ]);
  });

  it('caps pages after leaving out the ones already shown', async () => {
    const pages = [1, 2, 3, 4].map((n) => ({ title: `Go page ${n}`, url: `https://go.example/${n}` }));
    const webos = await webosWithBrowser({ bookmarks: pages });
    const group = await webos.links.addGroup('Dev');
    await webos.links.addLink(group, { title: 'Go page 1', url: 'go.example/1' });

    expect(titles((await webos.launcher.search('go page')).filter((result) => result.kind === 'bookmark'))).toEqual([
      'Go page 2',
      'Go page 3',
      'Go page 4',
    ]);
  });

  it('lists actions, Links, Todos and Notes, bookmarks, history, then the web search, in that order', async () => {
    const webos = await webosWithBrowser({
      bookmarks: [{ title: 'UUID spec', url: 'https://www.rfc-editor.org/rfc/rfc9562' }],
      history: [visited('UUID tool', 'https://uuid.example')],
    });
    const group = await webos.links.addGroup('Dev');
    await webos.links.addLink(group, { title: 'UUID generator', url: 'uuid.example/generate' });
    await webos.todos.add('uuid migration');
    await webos.notes.create('UUID notes');

    expect((await webos.launcher.search('uuid')).map((result) => result.kind)).toEqual([
      'action',
      'link',
      'todo',
      'note',
      'bookmark',
      'history',
      'web',
    ]);
  });

  it.each(['', '   '])('finds nothing, not even a web search, for the empty query "%s"', async (query) => {
    const webos = await webosWith();

    expect(await webos.launcher.search(query)).toEqual([]);
  });
});

describe('Launcher actions', () => {
  /** The action the Launcher offers first for `query`. */
  async function firstAction(webos: Awaited<ReturnType<typeof webosWith>>, query: string) {
    const [first] = await webos.launcher.search(query);
    if (first?.kind !== 'action') throw new Error(`No action for "${query}"`);
    return first;
  }

  it('"new todo <text>" adds a Todo with that text', async () => {
    const webos = await webosWith();

    const action = await firstAction(webos, 'new todo Buy milk');
    const outcome = await webos.launcher.run(action);

    expect(action.title).toBe('Add Todo "Buy milk"');
    expect(webos.todos.open().map((todo) => todo.text)).toEqual(['Buy milk']);
    expect(outcome).toEqual({ kind: 'todo-added', todoId: webos.todos.open()[0].id });
  });

  it('"new note <text>" creates a Note starting with that text, selected for the Notes App to open', async () => {
    const webos = await webosWith();

    const action = await firstAction(webos, 'new note Release plan');
    const outcome = await webos.launcher.run(action);

    expect(action.title).toBe('New Note "Release plan"');
    expect(webos.notes.list().map((note) => note.body)).toEqual(['Release plan']);
    expect(outcome).toEqual({ kind: 'note-created', noteId: webos.notes.selected()?.id });
  });

  it('"new note" on its own creates an empty Note', async () => {
    const webos = await webosWith();

    const action = await firstAction(webos, 'new note');
    await webos.launcher.run(action);

    expect(action.title).toBe('New Note');
    expect(webos.notes.list().map((note) => note.title)).toEqual(['Untitled']);
  });

  it('"uuid" gives a new v4 UUID to copy each time', async () => {
    const webos = await webosWith();

    const action = await firstAction(webos, 'UUID');
    const first = await webos.launcher.run(action);
    const second = await webos.launcher.run(action);

    expect(action.title).toBe('Copy a new UUID');
    expect(first).toEqual({ kind: 'copy', text: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/) });
    expect(second).not.toEqual(first);
  });

  it('runs "uuid" only on its own, so "uuid v7" is just a search', async () => {
    const webos = await webosWith();

    expect(titles(await webos.launcher.search('uuid v7'))).toEqual(['Search DuckDuckGo for "uuid v7"']);
  });

  it('offers to finish "new todo" when its text is still missing', async () => {
    const webos = await webosWith();

    const action = await firstAction(webos, 'New  Todo');

    expect(action).toMatchObject({ title: 'new todo …', queryToFill: 'new todo ' });
  });

  it.each(['n', 'new', 'new t', 'uui', 'uuids'])('offers no action for "%s", which isn\'t a command', async (query) => {
    const webos = await webosWith();

    expect((await webos.launcher.search(query)).some((result) => result.kind === 'action')).toBe(false);
  });

  it('does nothing when a suggestion is run instead of finished', async () => {
    const webos = await webosWith();

    const outcome = await webos.launcher.run(await firstAction(webos, 'new todo'));

    expect(outcome).toBeUndefined();
    expect(webos.todos.open()).toEqual([]);
  });
});
