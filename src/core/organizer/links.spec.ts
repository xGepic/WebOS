import { createWebOS } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

async function webosWith(storage = createMemoryStorage()) {
  return createWebOS({ storage, clock: createTestClock(new Date(2026, 10, 12, 9, 0)) });
}

describe('Link URL normalisation', () => {
  it.each([
    ['github.com', 'https://github.com'],
    ['github.com/angular/angular?tab=readme#top', 'https://github.com/angular/angular?tab=readme#top'],
    ['  example.com  ', 'https://example.com'],
    ['localhost', 'http://localhost'],
    ['localhost:4200', 'http://localhost:4200'],
    ['localhost:4200/admin', 'http://localhost:4200/admin'],
    ['api.localhost:3000', 'http://api.localhost:3000'],
    ['localhostfan.com', 'https://localhostfan.com'],
    ['127.0.0.1:8080', 'http://127.0.0.1:8080'],
    ['192.168.1.20/router', 'http://192.168.1.20/router'],
    ['10.0.0.5', 'http://10.0.0.5'],
    ['[::1]:5173', 'http://[::1]:5173'],
    ['https://example.com/a', 'https://example.com/a'],
    ['http://intranet.example.com', 'http://intranet.example.com'],
    ['HTTPS://Example.com', 'HTTPS://Example.com'],
    ['chrome://extensions', 'chrome://extensions'],
  ])('saves "%s" as %s', async (typed, saved) => {
    const webos = await webosWith();
    const group = await webos.links.addGroup('Dev');

    await webos.links.addLink(group, { title: 'Link', url: typed });

    expect(webos.links.groups()[0].links[0].url).toBe(saved);
  });
});

/** What the Links Widget would show: each Link Group's name with its Link titles, in order. */
const shown = (webos: Awaited<ReturnType<typeof webosWith>>) =>
  webos.links.groups().map((group) => `${group.name}: ${group.links.map((link) => link.title).join(', ')}`);

async function webosWithTwoGroups() {
  const webos = await webosWith();
  const local = await webos.links.addGroup('Local');
  const web = await webos.links.addLink(local, { title: 'web', url: 'localhost:4200' });
  const api = await webos.links.addLink(local, { title: 'api', url: 'localhost:8080' });
  const docs = await webos.links.addLink(local, { title: 'docs', url: 'localhost:3000' });
  const dashboards = await webos.links.addGroup('Dashboards');
  const grafana = await webos.links.addLink(dashboards, { title: 'Grafana', url: 'grafana.example.com' });
  return { webos, groups: { local, dashboards }, links: { web, api, docs, grafana } };
}

describe('Link order', () => {
  it('keeps Link Groups and their Links in the order they were added', async () => {
    const { webos } = await webosWithTwoGroups();

    expect(shown(webos)).toEqual(['Local: web, api, docs', 'Dashboards: Grafana']);
  });

  it('moves a Link to another place in its Link Group', async () => {
    const { webos, groups, links } = await webosWithTwoGroups();

    await webos.links.moveLink(links.docs, groups.local, 0);

    expect(shown(webos)).toEqual(['Local: docs, web, api', 'Dashboards: Grafana']);
  });

  it('moves a Link into another Link Group at the chosen place', async () => {
    const { webos, groups, links } = await webosWithTwoGroups();

    await webos.links.moveLink(links.api, groups.dashboards, 0);

    expect(shown(webos)).toEqual(['Local: web, docs', 'Dashboards: api, Grafana']);
  });

  it('moves a Link to the end when the chosen place is past the last Link', async () => {
    const { webos, groups, links } = await webosWithTwoGroups();

    await webos.links.moveLink(links.web, groups.dashboards, 99);

    expect(shown(webos)).toEqual(['Local: api, docs', 'Dashboards: Grafana, web']);
  });

  it('moves a Link Group to another place', async () => {
    const { webos, groups } = await webosWithTwoGroups();

    await webos.links.moveGroup(groups.dashboards, 0);

    expect(shown(webos)).toEqual(['Dashboards: Grafana', 'Local: web, api, docs']);
  });
});

describe('editing and deleting Links', () => {
  it('renames a Link Group', async () => {
    const { webos, groups } = await webosWithTwoGroups();

    await webos.links.renameGroup(groups.local, 'Dev servers');

    expect(shown(webos)).toEqual(['Dev servers: web, api, docs', 'Dashboards: Grafana']);
  });

  it('edits a Link, normalising its new URL', async () => {
    const { webos, links } = await webosWithTwoGroups();

    await webos.links.editLink(links.grafana, { title: 'Metrics', url: 'localhost:3001' });

    expect(webos.links.groups()[1].links[0]).toMatchObject({ title: 'Metrics', url: 'http://localhost:3001' });
  });

  it('deletes a Link', async () => {
    const { webos, links } = await webosWithTwoGroups();

    await webos.links.deleteLink(links.api);

    expect(shown(webos)).toEqual(['Local: web, docs', 'Dashboards: Grafana']);
  });

  it('deletes a Link Group together with its Links', async () => {
    const { webos, groups, links } = await webosWithTwoGroups();

    await webos.links.deleteGroup(groups.local);
    // Its Links are gone, not orphaned: moving one into a remaining group finds nothing.
    await webos.links.moveLink(links.web, groups.dashboards, 0);

    expect(shown(webos)).toEqual(['Dashboards: Grafana']);
  });
});

describe('Link persistence', () => {
  it('keeps Link Groups and Links for the next tab', async () => {
    const storage = createMemoryStorage();
    const tab = await webosWith(storage);
    const group = await tab.links.addGroup('Local');
    await tab.links.addLink(group, { title: 'web', url: 'localhost:4200' });

    const nextTab = await webosWith(storage);

    expect(shown(nextTab)).toEqual(['Local: web']);
    expect(nextTab.links.groups()[0].links[0].url).toBe('http://localhost:4200');
  });
});
