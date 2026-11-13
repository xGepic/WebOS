import { StateDocumentError, createWebOS, type WebOS } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

const NOV_12 = new Date(2026, 10, 12, 9, 0);

async function webosWith(storage = createMemoryStorage()) {
  return createWebOS({ storage, clock: createTestClock(NOV_12) });
}

/** Everything a user can see of their data, to compare two cores by. */
function everything(webos: WebOS) {
  return {
    name: webos.profile.name(),
    open: webos.todos.open(),
    completed: webos.todos.completed(),
    notes: webos.notes.list(),
    selected: webos.notes.selected()?.id,
    pinned: webos.notes.forWidget()?.id,
    layout: webos.desktop.layout(),
    hidden: webos.desktop.hidden(),
    devUtilitiesTab: webos.devUtilities.activeTab(),
  };
}

/** A core with some of everything in it. */
async function webosWithData() {
  const webos = await webosWith();
  await webos.profile.setName('Stefan');
  await webos.todos.add('Ship the Launcher');
  const done = await webos.todos.add('Write the spec');
  await webos.todos.complete(done!);
  await webos.notes.create('# Ideas');
  const pinned = await webos.notes.create('Release plan');
  await webos.notes.pin(pinned);
  await webos.desktop.hide('clock');
  await webos.devUtilities.setActiveTab('diff');
  return webos;
}

describe('Backup', () => {
  it('imports an export into another webOS exactly as it was', async () => {
    const original = await webosWithData();
    const other = await webosWith();

    await other.backup.import(original.backup.export().text);

    expect(everything(other)).toEqual(everything(original));
  });

  it('replaces all data as a whole, saves it, and reaches other open tabs', async () => {
    const backup = (await webosWithData()).backup.export().text;
    const storage = createMemoryStorage();
    const webos = await webosWith(storage);
    const otherTab = await webosWith(storage.openTab());
    await webos.todos.add('Only here before the import');
    await webos.notes.create('Also only here');

    await webos.backup.import(backup);

    expect(webos.todos.open().map((todo) => todo.text)).toEqual(['Ship the Launcher']);
    expect(webos.notes.list().map((note) => note.title).sort()).toEqual(['Ideas', 'Release plan']);
    expect(everything(await webosWith(storage.openTab()))).toEqual(everything(webos));
    // An open tab whose Note is gone shows the most recently edited one, as after any deletion.
    expect({ ...everything(otherTab), selected: undefined }).toEqual({ ...everything(webos), selected: undefined });
  });

  it('names the file after today', async () => {
    const webos = await webosWith();

    expect(webos.backup.export().fileName).toBe('webos-backup-2026-11-12.json');
  });

  const todo = (id: string) => ({ id, text: 'Todo', createdAt: 0, completedAt: null });
  const note = (id: string) => ({ id, body: 'Note', createdAt: 0, editedAt: 0 });

  /** A valid backup (from version 12, which webOS brings forward) with one part replaced. */
  const backupWith = (change: Record<string, unknown>) =>
    JSON.stringify({
      schemaVersion: 12,
      profile: { name: '' },
      apps: {},
      linkGroups: [],
      dockedLinkIds: [],
      todos: [],
      notes: [],
      pinnedNoteId: null,
      layout: [],
      weather: { city: null, report: null },
      countdowns: [],
      worldClocks: [],
      github: { token: '', contributions: null },
      ...change,
    });

  it.each([
    ["text that isn't JSON", 'Todo: buy milk', /isn't valid JSON/],
    ["JSON that isn't an object", '[1, 2, 3]', /isn't a webOS backup/],
    ['an object without a schema version', '{ "name": "Stefan" }', /isn't a webOS backup/],
    ["a schema version that isn't a whole number", backupWith({ schemaVersion: 7.5 }), /invalid schema version/],
    ['a missing part', backupWith({ todos: undefined }), /damaged/],
    ['a Todo without text', backupWith({ todos: [{ id: 'a', createdAt: 0, completedAt: null }] }), /damaged/],
    ["a Note whose body isn't text", backupWith({ notes: [{ id: 'a', body: 42, createdAt: 0, editedAt: 0 }] }), /damaged/],
    ["a name that isn't text", backupWith({ profile: { name: null } }), /damaged/],
    ['schema version 0, which would import as nothing', backupWith({ schemaVersion: 0 }), /isn't a webOS backup/],
    ['two Todos with the same id', backupWith({ todos: [todo('a'), todo('a')] }), /damaged/],
    ['two Notes with the same id', backupWith({ notes: [note('a'), note('a')] }), /damaged/],
  ])('rejects %s, saying why, and changes nothing', async (_, text, reason) => {
    const storage = createMemoryStorage();
    const webos = await webosWith(storage);
    await webos.todos.add('Keep me');
    const before = everything(webos);
    const stored = await storage.read();

    const result = webos.backup.import(text);

    await expect(result).rejects.toThrow(StateDocumentError);
    await expect(result).rejects.toThrow(reason);
    expect(everything(webos)).toEqual(before);
    expect(await storage.read()).toEqual(stored);
  });

  it('rejects a backup from a newer webOS, saying so, and changes nothing', async () => {
    const storage = createMemoryStorage();
    const webos = await webosWith(storage);
    await webos.todos.add('Keep me');
    const before = everything(webos);
    const stored = await storage.read();

    const result = webos.backup.import(backupWith({ schemaVersion: 17 }));

    await expect(result).rejects.toThrow('This file comes from a newer webOS (schema version 17, this build knows 16).');
    expect(everything(webos)).toEqual(before);
    expect(await storage.read()).toEqual(stored);
  });

  it('changes nothing when the import cannot be saved', async () => {
    const storage = createMemoryStorage();
    const webos = await webosWith({ ...storage, write: async (document) => {
      if (JSON.stringify(document).includes('From the backup')) throw new Error('Storage is full');
      return storage.write(document);
    } });
    await webos.todos.add('Keep me');
    const before = everything(webos);

    const result = webos.backup.import(backupWith({ todos: [{ ...todo('t'), text: 'From the backup' }] }));

    await expect(result).rejects.toThrow('Storage is full');
    expect(everything(webos)).toEqual(before);
  });

  it('brings a backup from an older webOS forward', async () => {
    const webos = await webosWith();
    // Version 6: Notes, but no Pinned Note and no Desktop layout yet.
    const older = JSON.stringify({
      schemaVersion: 6,
      profile: { name: 'Stefan' },
      apps: {},
      linkGroups: [],
      dockedLinkIds: [],
      todos: [{ id: 't', text: 'Old Todo', createdAt: 0, completedAt: null }],
      notes: [{ id: 'n', body: '# Old Note', createdAt: 0, editedAt: 0 }],
    });

    await webos.backup.import(older);

    expect(webos.profile.name()).toBe('Stefan');
    expect(webos.todos.open().map((todo) => todo.text)).toEqual(['Old Todo']);
    expect(webos.notes.forWidget()?.title).toBe('Old Note');
    expect(webos.desktop.hidden()).toEqual([]);
    expect(webos.desktop.layout()).toHaveLength(12);
  });
});
