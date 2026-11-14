import type { StateDocument } from '../state/state';
import type { Store } from '../store';
import { greetingFor } from './greeting';
import * as notes from './notes';
import * as todos from './todos';

export interface OrganizerApi {
  readonly profile: {
    /** The greeting for the current time of day, with the name if one is set: "Good morning, Stefan". */
    greeting(): string;
    /** The name as the user typed it; empty when not set. */
    name(): string;
    /** Sets the name the greeting uses, and saves it. */
    setName(name: string): Promise<void>;
  };
  readonly todos: {
    /** Open Todos in display order. */
    open(): readonly todos.Todo[];
    /** Completed Todos, most recently completed first. */
    completed(): readonly todos.Todo[];
    /** Adds a Todo at the end of the list. Resolves to its id, or undefined if the text is blank. */
    add(text: string): Promise<string | undefined>;
    /** Checks a Todo off, recording the current time. */
    complete(id: string): Promise<void>;
    /** Unchecks a Todo, which returns to its place and is no longer due to be cleared. */
    uncomplete(id: string): Promise<void>;
    /** Replaces a Todo's text; blank text is ignored. */
    editText(id: string, text: string): Promise<void>;
    delete(id: string): Promise<void>;
    /** Moves an open Todo to `toIndex` among the open Todos (clamped). */
    move(id: string, toIndex: number): Promise<void>;
  };
  readonly notes: {
    /** Every Note with its title, most recently edited first. */
    list(): readonly notes.ListedNote[];
    /** Creates a Note with `body` (empty by default) and selects it. Resolves to its id. */
    create(body?: string): Promise<string>;
    /** Replaces a Note's body, recording the edit time. An unchanged body is not an edit. */
    edit(id: string, body: string): Promise<void>;
    delete(id: string): Promise<void>;
    /**
     * The Note the Notes App shows in this tab. It starts as the remembered
     * selection (or the most recently edited Note) and changes only by this
     * tab's own commands, or when the Note is deleted: then it falls back to the
     * most recently edited Note. Another tab selecting or editing Notes never
     * swaps it. Undefined when there are no Notes.
     */
    selected(): notes.ListedNote | undefined;
    /** Selects a Note in this tab, and remembers it for the next time the Notes App opens in any tab. */
    select(id: string): Promise<void>;
  };
}

/** The profile, Todos and Notes. */
export function createOrganizer(store: Store): OrganizerApi {
  const { clock } = store;
  const state = store.state;

  /** The Note this tab's Notes App shows; see `notes.selected`. Kept per tab, so it isn't part of the state. */
  let shownNoteId = notes.shownNoteId(state().notes, state().apps.notes?.selectedNoteId);
  // The shown Note stays one that exists. A tab that imports a backup shows the Note the
  // backup remembers, like a tab that has just opened.
  store.onAdopt((next, { imported }) => {
    shownNoteId = notes.shownNoteId(next.notes, imported ? next.apps.notes?.selectedNoteId : shownNoteId);
  });

  /** Applies a change to the Notes. */
  const commitNotes = (change: (list: readonly notes.Note[]) => notes.Note[]) =>
    store.commit({ ...state(), notes: change(state().notes) });

  /** Shows a Note in this tab and remembers it as the Notes App's selection, saved with `next`. */
  const commitSelection = (id: string, next: StateDocument = state()) => {
    shownNoteId = id;
    return store.commit({ ...next, apps: { ...next.apps, notes: { ...next.apps.notes, selectedNoteId: id } } });
  };

  /** Applies a change to the Todos. */
  const commitTodos = (change: (list: readonly todos.Todo[]) => todos.Todo[]) =>
    store.commit({ ...state(), todos: change(state().todos) });

  return {
    profile: {
      name: () => state().profile.name,
      greeting: () => greetingFor(clock.now(), state().profile.name),
      setName: (name) => store.commit({ ...state(), profile: { ...state().profile, name } }),
    },
    todos: {
      open: () => todos.openTodos(state().todos),
      completed: () => todos.completedTodos(state().todos),
      async add(text) {
        if (!text.trim()) return undefined;
        const id = crypto.randomUUID();
        await commitTodos((list) => todos.addTodo(list, { id, text, createdAt: clock.now().getTime() }));
        return id;
      },
      complete: (id) => commitTodos((list) => todos.setCompleted(list, id, clock.now().getTime())),
      uncomplete: (id) => commitTodos((list) => todos.setCompleted(list, id, null)),
      editText: (id, text) => commitTodos((list) => todos.editText(list, id, text)),
      delete: (id) => commitTodos((list) => todos.deleteTodo(list, id)),
      move: (id, toIndex) => commitTodos((list) => todos.moveTodo(list, id, toIndex)),
    },
    notes: {
      list: () => notes.listNotes(state(), clock.now()),
      async create(body = '') {
        const id = crypto.randomUUID();
        await commitSelection(id, { ...state(), notes: notes.createNote(state().notes, { id, body }, clock.now().getTime()) });
        return id;
      },
      edit: (id, body) => commitNotes((list) => notes.editNote(list, id, body, clock.now().getTime())),
      delete: (id) => commitNotes((list) => notes.deleteNote(list, id)),
      selected: () => notes.listedNote(state(), shownNoteId, clock.now()),
      select: (id) => commitSelection(id),
    },
  };
}
