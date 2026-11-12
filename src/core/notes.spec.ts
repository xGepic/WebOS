import { createWebOS, type WebOS } from './index';
import { createMemoryStorage, createTestClock, type TestClock } from './testing';

const start = new Date(2026, 10, 12, 9, 0);

async function webosAt(clock: TestClock = createTestClock(start), storage = createMemoryStorage()) {
  return createWebOS({ storage, clock });
}

/** What the Notes sidebar shows: each Note's title, in order. */
const sidebar = (webos: WebOS) => webos.notes.list().map((note) => note.title);

describe('a Note\'s title', () => {
  it.each([
    ['# Meeting notes\nAgenda', 'Meeting notes'],
    ['### Ideas ###\n- one', 'Ideas'],
    ['\n\n   Shopping list  \nmilk', 'Shopping list'],
    ['#\n\nAfter an empty heading', 'After an empty heading'],
    ['#hashtag is not a heading', '#hashtag is not a heading'],
    ['Fix bug #', 'Fix bug #'],
    ['', 'Untitled'],
    ['   \n\t\n', 'Untitled'],
    ['##   \n', 'Untitled'],
  ])('of %j is %j', async (body, title) => {
    const webos = await webosAt();

    await webos.notes.create(body);

    expect(sidebar(webos)).toEqual([title]);
  });

  it('follows the Note\'s first line as it is edited', async () => {
    const webos = await webosAt();
    const id = await webos.notes.create('');

    await webos.notes.edit(id, '# Release plan\n\nShip it');

    expect(sidebar(webos)).toEqual(['Release plan']);
    expect(webos.notes.list()[0].body).toBe('# Release plan\n\nShip it');
  });
});

async function webosWithNotes() {
  const clock = createTestClock(start);
  const storage = createMemoryStorage();
  const webos = await webosAt(clock, storage);
  const a = await webos.notes.create('Alpha');
  clock.advance(60_000);
  const b = await webos.notes.create('Bravo');
  clock.advance(60_000);
  const c = await webos.notes.create('Charlie');
  clock.advance(60_000);
  return { webos, ids: { a, b, c }, clock, storage };
}

describe('the Notes list', () => {
  it('lists Notes most recently edited first', async () => {
    const { webos, ids } = await webosWithNotes();
    expect(sidebar(webos)).toEqual(['Charlie', 'Bravo', 'Alpha']);

    await webos.notes.edit(ids.a, 'Alpha, revised');

    expect(sidebar(webos)).toEqual(['Alpha, revised', 'Charlie', 'Bravo']);
    expect(webos.notes.list()[0].editedAt).toBe(start.getTime() + 3 * 60_000);
    expect(webos.notes.list()[0].createdAt).toBe(start.getTime());
  });

  it('does not move a Note whose text did not change', async () => {
    const { webos, ids } = await webosWithNotes();

    await webos.notes.edit(ids.a, 'Alpha');

    expect(sidebar(webos)).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  it('keeps Notes for the next tab', async () => {
    const { ids, webos, clock, storage } = await webosWithNotes();
    await webos.notes.edit(ids.b, '# Bravo\nmore');

    const nextTab = await webosAt(clock, storage);

    expect(sidebar(nextTab)).toEqual(['Bravo', 'Charlie', 'Alpha']);
  });

  it('deletes a Note', async () => {
    const { webos, ids } = await webosWithNotes();

    await webos.notes.delete(ids.b);

    expect(sidebar(webos)).toEqual(['Charlie', 'Alpha']);
  });
});

describe('the selected Note', () => {
  it('is the most recently edited Note until one is chosen', async () => {
    const { webos } = await webosWithNotes();

    expect(webos.notes.selected()?.title).toBe('Charlie');
  });

  it('is remembered and restored when the Notes App reopens in another tab', async () => {
    const { webos, ids, clock, storage } = await webosWithNotes();

    await webos.notes.select(ids.a);
    const nextTab = await webosAt(clock, storage);

    expect(webos.notes.selected()?.title).toBe('Alpha');
    expect(nextTab.notes.selected()?.title).toBe('Alpha');
  });

  it('is a newly created Note', async () => {
    const { webos, ids } = await webosWithNotes();
    await webos.notes.select(ids.a);

    await webos.notes.create('# Fresh');

    expect(webos.notes.selected()?.title).toBe('Fresh');
  });

  it('falls back to the most recently edited Note when the selected one is deleted', async () => {
    const { webos, ids } = await webosWithNotes();
    await webos.notes.select(ids.a);

    await webos.notes.delete(ids.a);

    expect(webos.notes.selected()?.title).toBe('Charlie');
  });

  it('is nothing when there are no Notes', async () => {
    const webos = await webosAt();

    expect(webos.notes.selected()).toBeUndefined();
  });
});

describe('when a Note was last edited, as the sidebar shows it', () => {
  it.each([
    [0, '9:00 AM'],
    [14 * 60 * 60_000 + 59 * 60_000, '9:00 AM'],
    [15 * 60 * 60_000, 'Yesterday'],
    [2 * 24 * 60 * 60_000, 'Nov 12'],
    [60 * 24 * 60 * 60_000, 'Nov 12, 2026'],
  ])('%i ms later it reads %j', async (later, label) => {
    const clock = createTestClock(start);
    const webos = await webosAt(clock);
    await webos.notes.create('Note');

    clock.advance(later);

    expect(webos.notes.list()[0].edited).toBe(label);
  });
});

describe('the selected Note with several tabs open', () => {
  it('stays put in this tab when another tab selects a different Note', async () => {
    const { webos, ids, clock, storage } = await webosWithNotes();
    await webos.notes.select(ids.a);
    const otherTab = await webosAt(clock, storage.openTab());

    await otherTab.notes.select(ids.b);

    expect(webos.notes.selected()?.title).toBe('Alpha');
    expect(otherTab.notes.selected()?.title).toBe('Bravo');
  });

  it('stays put when another tab makes a different Note the most recently edited', async () => {
    const { webos, ids, clock, storage } = await webosWithNotes();
    // Deleting the selected Note leaves this tab showing the fallback: the most recently edited Note.
    await webos.notes.select(ids.b);
    await webos.notes.delete(ids.b);
    expect(webos.notes.selected()?.title).toBe('Charlie');
    const otherTab = await webosAt(clock, storage.openTab());

    await otherTab.notes.edit(ids.a, 'Alpha, from the other tab');

    expect(webos.notes.selected()?.title).toBe('Charlie');
  });

  it('shows another tab\'s edits to the selected Note', async () => {
    const { webos, ids, clock, storage } = await webosWithNotes();
    await webos.notes.select(ids.a);
    const otherTab = await webosAt(clock, storage.openTab());

    await otherTab.notes.edit(ids.a, 'Alpha, from the other tab');

    expect(webos.notes.selected()?.body).toBe('Alpha, from the other tab');
  });

  it('falls back to the most recently edited Note when another tab deletes the selected one', async () => {
    const { webos, ids, clock, storage } = await webosWithNotes();
    await webos.notes.select(ids.a);
    const otherTab = await webosAt(clock, storage.openTab());

    await otherTab.notes.delete(ids.a);

    expect(webos.notes.selected()?.title).toBe('Charlie');
  });
});

describe('the Pinned Note and the Notes Widget', () => {
  /** What the Notes Widget previews: the title of its Note. */
  const widget = (webos: WebOS) => webos.notes.forWidget()?.title;

  it('previews the Pinned Note', async () => {
    const { webos, ids } = await webosWithNotes();

    await webos.notes.pin(ids.a);

    expect(widget(webos)).toBe('Alpha');
    expect(webos.notes.list().filter((note) => note.pinned).map((note) => note.title)).toEqual(['Alpha']);
  });

  it('keeps one Pinned Note: pinning another replaces it', async () => {
    const { webos, ids } = await webosWithNotes();
    await webos.notes.pin(ids.a);

    await webos.notes.pin(ids.b);

    expect(widget(webos)).toBe('Bravo');
    expect(webos.notes.list().filter((note) => note.pinned).map((note) => note.title)).toEqual(['Bravo']);
  });

  it('previews the most recently edited Note when none is pinned', async () => {
    const { webos, ids } = await webosWithNotes();
    await webos.notes.pin(ids.a);

    await webos.notes.unpin();

    expect(widget(webos)).toBe('Charlie');
    expect(webos.notes.list().some((note) => note.pinned)).toBe(false);
  });

  it('falls back to the most recently edited Note after the Pinned Note is deleted', async () => {
    const { webos, ids } = await webosWithNotes();
    await webos.notes.pin(ids.b);

    await webos.notes.delete(ids.b);

    expect(widget(webos)).toBe('Charlie');
    await webos.notes.edit(ids.a, 'Alpha, revised');
    expect(widget(webos)).toBe('Alpha, revised');
  });

  it('ignores pinning something that is not a Note, such as one another tab just deleted', async () => {
    const { webos, ids } = await webosWithNotes();
    await webos.notes.pin(ids.a);

    await webos.notes.pin('no-such-note');

    expect(widget(webos)).toBe('Alpha');
  });

  it('previews nothing when there are no Notes', async () => {
    const webos = await webosAt();

    expect(webos.notes.forWidget()).toBeUndefined();
  });

  it('keeps the Pinned Note for the next tab', async () => {
    const { webos, ids, clock, storage } = await webosWithNotes();
    await webos.notes.pin(ids.a);

    const nextTab = await webosAt(clock, storage);

    expect(widget(nextTab)).toBe('Alpha');
  });
});
