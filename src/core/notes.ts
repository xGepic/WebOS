import { formatWhen } from './format';
import type { StateDocument } from './state';

/** A Markdown document written in the Notes App. Times are epoch milliseconds. */
export interface Note {
  id: string;
  /** The Markdown text. */
  body: string;
  createdAt: number;
  editedAt: number;
}

/** A Note as the sidebar lists it. */
export interface ListedNote extends Note {
  /** Derived from the first line; see `titleOf`. */
  title: string;
  /** When it was last edited, e.g. "9:05 AM", "Yesterday" or "Nov 10". */
  edited: string;
  /** Whether it is the Pinned Note. */
  pinned: boolean;
}

/** An ATX heading's opening `#`s. Without a space after them, `#` is text, not a heading. */
const HEADING_OPENING = /^#{1,6}(?:\s+|$)/;
/** A heading's optional closing `#`s, as in `## Ideas ##`. */
const HEADING_CLOSING = /(?:^|\s+)#+$/;

/** A line's text with heading markers stripped, when it is a heading. */
function lineText(line: string): string {
  const trimmed = line.trim();
  const opening = HEADING_OPENING.exec(trimmed);
  if (!opening) return trimmed;
  return trimmed.slice(opening[0].length).replace(HEADING_CLOSING, '').trim();
}

/** The first non-empty line with Markdown heading markers stripped, or "Untitled" when there is none. */
export function titleOf(body: string): string {
  for (const line of body.split('\n')) {
    const text = lineText(line);
    if (text) return text;
  }
  return 'Untitled';
}

/** Every Note with its title, most recently edited first. */
const mostRecentlyEditedFirst = (a: Note, b: Note) => b.editedAt - a.editedAt || b.createdAt - a.createdAt;

/** The part of the state document that Notes are listed from. */
type NotesState = Pick<StateDocument, 'notes' | 'pinnedNoteId'>;

function toListed(note: Note, { pinnedNoteId }: NotesState, now: Date): ListedNote {
  return {
    ...note,
    title: titleOf(note.body),
    edited: formatWhen(new Date(note.editedAt), now),
    pinned: note.id === pinnedNoteId,
  };
}

export function listNotes(state: NotesState, now: Date): ListedNote[] {
  return state.notes.map((note) => toListed(note, state, now)).sort(mostRecentlyEditedFirst);
}

/** The Note with `id`, as the sidebar lists it. */
export function listedNote(state: NotesState, id: string | undefined, now: Date): ListedNote | undefined {
  const note = state.notes.find((candidate) => candidate.id === id);
  return note && toListed(note, state, now);
}

export function createNote(notes: readonly Note[], note: Pick<Note, 'id' | 'body'>, now: number): Note[] {
  return [...notes, { ...note, createdAt: now, editedAt: now }];
}

/** Replaces a Note's body and records when. An unchanged body leaves the Note as it was. */
export function editNote(notes: readonly Note[], id: string, body: string, now: number): Note[] {
  return notes.map((note) => (note.id === id && note.body !== body ? { ...note, body, editedAt: now } : note));
}

export function deleteNote(notes: readonly Note[], id: string): Note[] {
  return notes.filter((note) => note.id !== id);
}

/** The Pinned Note's id after a change to the Notes: kept while that Note exists, otherwise null. */
export function prunePin(notes: readonly Note[], pinnedNoteId: string | null): string | null {
  return notes.some((note) => note.id === pinnedNoteId) ? pinnedNoteId : null;
}

/** The Pinned Note's id after pinning `id`. Only a Note can be pinned; any other id leaves the pin as it was. */
export function pinNote({ notes, pinnedNoteId }: NotesState, id: string): string | null {
  return notes.some((note) => note.id === id) ? id : pinnedNoteId;
}

/**
 * Which Note to show, in the Notes App or on the Notes Widget: `id` while that
 * Note exists, otherwise the most recently edited Note. Undefined when there are no Notes.
 */
export function shownNoteId(notes: readonly Note[], id: string | null | undefined): string | undefined {
  const existing = notes.find((note) => note.id === id);
  if (existing) return existing.id;
  return [...notes].sort(mostRecentlyEditedFirst)[0]?.id;
}
