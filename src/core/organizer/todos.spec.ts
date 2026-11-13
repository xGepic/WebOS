import { createWebOS } from '../index';
import { createMemoryStorage, createTestClock, type TestClock } from '../testing';

const start = new Date(2026, 10, 12, 9, 0);

async function webosAt(clock: TestClock, storage = createMemoryStorage()) {
  return createWebOS({ storage, clock });
}

type WebOS = Awaited<ReturnType<typeof webosAt>>;

/** Adds a Todo that must be accepted, and returns its id. */
async function add(webos: WebOS, text: string): Promise<string> {
  const id = await webos.todos.add(text);
  if (!id) throw new Error(`"${text}" was not added`);
  return id;
}

/** What the Todos Widget shows: the open Todos, then the completed section. */
const shown = (webos: WebOS) => ({
  open: webos.todos.open().map((todo) => todo.text),
  completed: webos.todos.completed().map((todo) => todo.text),
});

async function webosWithTodos(clock = createTestClock(start), storage = createMemoryStorage()) {
  const webos = await webosAt(clock, storage);
  const ids = {
    a: await add(webos, 'Write tests'),
    b: await add(webos, 'Review PR'),
    c: await add(webos, 'Ship it'),
  };
  return { webos, ids, clock, storage };
}

describe('adding and completing Todos', () => {
  it('lists new Todos in the order they were added', async () => {
    const { webos } = await webosWithTodos();

    expect(shown(webos)).toEqual({ open: ['Write tests', 'Review PR', 'Ship it'], completed: [] });
  });

  it('moves a completed Todo into the completed section, recording when', async () => {
    const { webos, ids, clock } = await webosWithTodos();
    clock.advance(60_000);

    await webos.todos.complete(ids.b);

    expect(shown(webos)).toEqual({ open: ['Write tests', 'Ship it'], completed: ['Review PR'] });
    expect(webos.todos.completed()[0].completedAt).toBe(start.getTime() + 60_000);
    expect(webos.todos.completed()[0].createdAt).toBe(start.getTime());
  });
});

describe('changing Todos', () => {
  it('puts an unchecked Todo back where it was', async () => {
    const { webos, ids } = await webosWithTodos();
    await webos.todos.complete(ids.a);

    await webos.todos.uncomplete(ids.a);

    expect(shown(webos)).toEqual({ open: ['Write tests', 'Review PR', 'Ship it'], completed: [] });
    expect(webos.todos.open()[0].completedAt).toBeNull();
  });

  it('edits a Todo in place', async () => {
    const { webos, ids } = await webosWithTodos();

    await webos.todos.editText(ids.b, '  Review PR #42  ');

    expect(shown(webos).open).toEqual(['Write tests', 'Review PR #42', 'Ship it']);
  });

  it('ignores adding or editing blank text', async () => {
    const { webos, ids } = await webosWithTodos();

    await webos.todos.add('   ');
    await webos.todos.editText(ids.a, '  ');

    expect(shown(webos).open).toEqual(['Write tests', 'Review PR', 'Ship it']);
  });

  it('deletes a Todo, open or completed', async () => {
    const { webos, ids } = await webosWithTodos();
    await webos.todos.complete(ids.c);

    await webos.todos.delete(ids.a);
    await webos.todos.delete(ids.c);

    expect(shown(webos)).toEqual({ open: ['Review PR'], completed: [] });
  });
});

describe('Todo order', () => {
  it('moves an open Todo to another place', async () => {
    const { webos, ids } = await webosWithTodos();

    await webos.todos.move(ids.c, 0);

    expect(shown(webos).open).toEqual(['Ship it', 'Write tests', 'Review PR']);
  });

  it('moves an open Todo among the open ones when another is completed', async () => {
    const { webos, ids } = await webosWithTodos();
    const d = await add(webos, 'Celebrate');
    await webos.todos.complete(ids.b);

    // Open list is Write tests, Ship it, Celebrate: put Celebrate second.
    await webos.todos.move(d, 1);

    expect(shown(webos)).toEqual({ open: ['Write tests', 'Celebrate', 'Ship it'], completed: ['Review PR'] });
  });

  it('keeps a moved order when a completed Todo is unchecked', async () => {
    const { webos, ids } = await webosWithTodos();
    await webos.todos.complete(ids.b);
    await webos.todos.move(ids.c, 0);

    await webos.todos.uncomplete(ids.b);

    expect(shown(webos).open).toEqual(['Ship it', 'Write tests', 'Review PR']);
  });

  it('lists completed Todos most recently completed first', async () => {
    const { webos, ids, clock } = await webosWithTodos();
    await webos.todos.complete(ids.c);
    clock.advance(1_000);
    await webos.todos.complete(ids.a);

    expect(shown(webos).completed).toEqual(['Write tests', 'Ship it']);
  });
});

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

describe('clearing completed Todos when the Desktop loads', () => {
  it('keeps a completed Todo until just before 3 days have passed', async () => {
    const { webos, ids, clock, storage } = await webosWithTodos();
    await webos.todos.complete(ids.a);

    clock.advance(THREE_DAYS - 1);
    const nextLoad = await webosAt(clock, storage);

    expect(shown(nextLoad).completed).toEqual(['Write tests']);
  });

  it('clears a completed Todo once exactly 3 days have passed', async () => {
    const { webos, ids, clock, storage } = await webosWithTodos();
    await webos.todos.complete(ids.a);

    clock.advance(THREE_DAYS);
    const nextLoad = await webosAt(clock, storage);

    expect(shown(nextLoad)).toEqual({ open: ['Review PR', 'Ship it'], completed: [] });
  });

  it('cancels the clearing when the Todo is unchecked', async () => {
    const { webos, ids, clock, storage } = await webosWithTodos();
    await webos.todos.complete(ids.a);
    clock.advance(THREE_DAYS / 3);
    await webos.todos.uncomplete(ids.a);

    clock.advance(THREE_DAYS);
    const nextLoad = await webosAt(clock, storage);

    expect(shown(nextLoad).open).toEqual(['Write tests', 'Review PR', 'Ship it']);
  });

  it('counts 3 days from the latest completion after re-checking', async () => {
    const { webos, ids, clock, storage } = await webosWithTodos();
    await webos.todos.complete(ids.a);
    await webos.todos.uncomplete(ids.a);
    clock.advance(2 * 24 * 60 * 60 * 1000);
    await webos.todos.complete(ids.a);

    clock.advance(THREE_DAYS - 1);
    const nextLoad = await webosAt(clock, storage);

    expect(shown(nextLoad).completed).toEqual(['Write tests']);
  });

  it('never clears open Todos, however old', async () => {
    const { clock, storage } = await webosWithTodos();

    clock.advance(30 * THREE_DAYS);
    const nextLoad = await webosAt(clock, storage);

    expect(shown(nextLoad).open).toEqual(['Write tests', 'Review PR', 'Ship it']);
  });

  it('saves the cleared list, so later tabs agree', async () => {
    const { webos, ids, clock, storage } = await webosWithTodos();
    await webos.todos.complete(ids.a);
    clock.advance(THREE_DAYS);
    await webosAt(clock, storage);

    const laterTab = await webosAt(createTestClock(start), storage);

    expect(shown(laterTab)).toEqual({ open: ['Review PR', 'Ship it'], completed: [] });
  });
});
