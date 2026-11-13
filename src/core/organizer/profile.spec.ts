import { createWebOS } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

const morning = new Date(2026, 10, 12, 9, 0);

async function webosWith(storage = createMemoryStorage()) {
  return createWebOS({ storage, clock: createTestClock(morning) });
}

describe('greeting by name', () => {
  it('greets the user by name once a name is set', async () => {
    const webos = await webosWith();

    await webos.profile.setName('Stefan');

    expect(webos.profile.greeting()).toBe('Good morning, Stefan');
  });

  it('leaves the name out when it is blank', async () => {
    const webos = await webosWith();

    await webos.profile.setName('   ');

    expect(webos.profile.greeting()).toBe('Good morning');
  });

  it('trims spaces typed around the name', async () => {
    const webos = await webosWith();

    await webos.profile.setName(' Stefan ');

    expect(webos.profile.greeting()).toBe('Good morning, Stefan');
  });
});

describe('name persistence', () => {
  it('keeps the name for the next tab', async () => {
    const storage = createMemoryStorage();
    const firstTab = await webosWith(storage);
    await firstTab.profile.setName('Stefan');

    const nextTab = await webosWith(storage);

    expect(nextTab.profile.name()).toBe('Stefan');
    expect(nextTab.profile.greeting()).toBe('Good morning, Stefan');
  });

  it('starts with no name', async () => {
    const webos = await webosWith();

    expect(webos.profile.name()).toBe('');
    expect(webos.profile.greeting()).toBe('Good morning');
  });
});

describe('several open tabs', () => {
  it('shows a name set in one tab in another tab that is already open', async () => {
    const storage = createMemoryStorage();
    const olderTab = await webosWith(storage);
    const newerTab = await webosWith(storage.openTab());
    const seen: string[] = [];
    olderTab.subscribe(() => seen.push(olderTab.profile.greeting()));

    await newerTab.profile.setName('Stefan');

    expect(olderTab.profile.greeting()).toBe('Good morning, Stefan');
    expect(seen).toContain('Good morning, Stefan');
  });

  it('keeps typing in one tab from being rolled back by its own saves', async () => {
    const storage = createMemoryStorage();
    const tab = await webosWith(storage);
    const otherTab = await webosWith(storage.openTab());
    const names: string[] = [];
    tab.subscribe(() => names.push(tab.profile.name()));

    await Promise.all([tab.profile.setName('S'), tab.profile.setName('St'), tab.profile.setName('Ste')]);

    expect(names).toEqual(['S', 'St', 'Ste']);
    expect(otherTab.profile.name()).toBe('Ste');
  });
});
