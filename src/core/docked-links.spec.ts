import { createWebOS } from './index';
import { createMemoryStorage, createTestClock } from './testing';

async function webosWithLinks(storage = createMemoryStorage()) {
  const webos = await createWebOS({ storage, clock: createTestClock(new Date(2026, 10, 12, 9, 0)) });
  const local = await webos.links.addGroup('Local');
  const web = await webos.links.addLink(local, { title: 'web', url: 'localhost:4200' });
  const api = await webos.links.addLink(local, { title: 'api', url: 'localhost:8080' });
  const dashboards = await webos.links.addGroup('Dashboards');
  const grafana = await webos.links.addLink(dashboards, { title: 'Grafana', url: 'grafana.example.com' });
  return { webos, groups: { local, dashboards }, links: { web, api, grafana } };
}

/** What the Dock shows after its divider: the Docked Link titles, in Dock order. */
const dockShows = (webos: Awaited<ReturnType<typeof webosWithLinks>>['webos']) =>
  webos.links.docked().map((link) => link.title);

/** The Link titles in the first Link Group, in order. */
const firstGroupShows = (webos: Awaited<ReturnType<typeof webosWithLinks>>['webos']) =>
  webos.links.groups()[0].links.map((link) => link.title);

describe('docking Links', () => {
  it('adds Docked Links to the end of the Dock, in the order they were docked', async () => {
    const { webos, links } = await webosWithLinks();

    await webos.links.dock(links.grafana);
    await webos.links.dock(links.web);

    expect(dockShows(webos)).toEqual(['Grafana', 'web']);
  });

  it('docks a Link only once', async () => {
    const { webos, links } = await webosWithLinks();

    await webos.links.dock(links.web);
    await webos.links.dock(links.web);

    expect(dockShows(webos)).toEqual(['web']);
  });

  it('undocks a Link without deleting it', async () => {
    const { webos, links } = await webosWithLinks();
    await webos.links.dock(links.web);
    await webos.links.dock(links.api);

    await webos.links.undock(links.web);

    expect(dockShows(webos)).toEqual(['api']);
    expect(firstGroupShows(webos)).toEqual(['web', 'api']);
  });
});

describe('Dock order', () => {
  it('is independent of the order of Links in their Link Groups', async () => {
    const { webos, groups, links } = await webosWithLinks();
    await webos.links.dock(links.api);
    await webos.links.dock(links.web);

    await webos.links.moveLink(links.web, groups.local, 1);
    await webos.links.moveGroup(groups.dashboards, 0);

    expect(dockShows(webos)).toEqual(['api', 'web']);
  });

  it('changes when a Docked Link is moved in the Dock, leaving its Link Group alone', async () => {
    const { webos, links } = await webosWithLinks();
    await webos.links.dock(links.web);
    await webos.links.dock(links.api);
    await webos.links.dock(links.grafana);

    await webos.links.moveDocked(links.grafana, 0);

    expect(dockShows(webos)).toEqual(['Grafana', 'web', 'api']);
    expect(firstGroupShows(webos)).toEqual(['web', 'api']);
  });

  it('keeps a Docked Link in place when it moves to another Link Group', async () => {
    const { webos, groups, links } = await webosWithLinks();
    await webos.links.dock(links.web);
    await webos.links.dock(links.grafana);

    await webos.links.moveLink(links.web, groups.dashboards, 0);

    expect(dockShows(webos)).toEqual(['web', 'Grafana']);
  });
});

describe('Docked Links and deletion', () => {
  it('removes a deleted Link from the Dock', async () => {
    const { webos, links } = await webosWithLinks();
    await webos.links.dock(links.web);
    await webos.links.dock(links.api);

    await webos.links.deleteLink(links.web);

    expect(dockShows(webos)).toEqual(['api']);
  });

  it('removes the Docked Links of a deleted Link Group from the Dock', async () => {
    const { webos, groups, links } = await webosWithLinks();
    await webos.links.dock(links.web);
    await webos.links.dock(links.grafana);
    await webos.links.dock(links.api);

    await webos.links.deleteGroup(groups.local);

    expect(dockShows(webos)).toEqual(['Grafana']);
  });

  it('forgets deleted Links, so moving Docked Links afterwards counts only what is shown', async () => {
    const { webos, links } = await webosWithLinks();
    await webos.links.dock(links.web);
    await webos.links.dock(links.api);
    await webos.links.dock(links.grafana);
    await webos.links.deleteLink(links.web);

    await webos.links.moveDocked(links.grafana, 1);

    expect(dockShows(webos)).toEqual(['api', 'Grafana']);
  });
});

describe('Docked Links over time', () => {
  it('shows edits to a Docked Link in the Dock', async () => {
    const { webos, links } = await webosWithLinks();
    await webos.links.dock(links.grafana);

    await webos.links.editLink(links.grafana, { title: 'Metrics', url: 'metrics.example.com' });

    expect(webos.links.docked()[0]).toMatchObject({ title: 'Metrics', url: 'https://metrics.example.com' });
  });

  it('keeps the Docked Links and their order for the next tab', async () => {
    const storage = createMemoryStorage();
    const { webos, links } = await webosWithLinks(storage);
    await webos.links.dock(links.grafana);
    await webos.links.dock(links.web);

    const nextTab = await createWebOS({ storage, clock: createTestClock(new Date(2026, 10, 12, 9, 0)) });

    expect(dockShows(nextTab)).toEqual(['Grafana', 'web']);
  });
});
