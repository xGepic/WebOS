import { decodeBase64 } from '../dev-utilities/base64';
import { formatWhen } from '../format';

/** A text saved in the Clipboard App. Times are epoch milliseconds. */
export interface Clip {
  id: string;
  /** Exactly as pasted, untrimmed. */
  text: string;
  /** When it was pasted, or last pasted again. */
  savedAt: number;
  /** A pinned Clip is never dropped, and is listed first. */
  pinned: boolean;
}

/** The Dev Utilities tab a Clip can be opened in, by what its text is. */
export type ClipKind = 'json' | 'timestamp' | 'base64';

/** A Clip as the Clipboard App lists it. */
export interface ListedClip extends Clip {
  /** When it was saved, as a list shows it: "9:05 AM" today, then "Yesterday", "Nov 10". */
  saved: string;
  /** The Dev Utilities tab it can be opened in, if any. */
  kind: ClipKind | undefined;
}

/** What saving a pasted text did. */
export type SaveResult = 'saved' | 'moved' | 'empty' | 'too-long';

/** How many unpinned Clips are kept. Pinned ones don't count. */
export const MAX_UNPINNED_CLIPS = 50;
/** The longest text saved as a Clip, so that a few Clips can't fill the extension's storage. */
export const MAX_CLIP_LENGTH = 100_000;

/**
 * The Clips are stored newest first. Listing them puts the pinned ones first,
 * each group keeping that order.
 */
export function listClips(clips: readonly Clip[], now: Date): ListedClip[] {
  const listed = (clip: Clip): ListedClip => ({
    ...clip,
    saved: formatWhen(new Date(clip.savedAt), now),
    kind: clipKind(clip.text),
  });
  return [...clips.filter((clip) => clip.pinned), ...clips.filter((clip) => !clip.pinned)].map(
    listed,
  );
}

/** Why `text` can't be saved, if it can't. */
export function refusal(text: string): Extract<SaveResult, 'empty' | 'too-long'> | undefined {
  if (!text.trim()) return 'empty';
  if (text.length > MAX_CLIP_LENGTH) return 'too-long';
  return undefined;
}

/**
 * Saves `text` at the top. Text that is already a Clip moves that Clip to the
 * top, keeping its pin. Afterwards, unpinned Clips beyond the newest 50 are dropped.
 */
export function saveClip(
  clips: readonly Clip[],
  clip: Pick<Clip, 'id' | 'text' | 'savedAt'>,
): Clip[] {
  const existing = clips.find((candidate) => candidate.text === clip.text);
  const saved = existing ? { ...existing, savedAt: clip.savedAt } : { ...clip, pinned: false };
  return keepNewest([saved, ...clips.filter((candidate) => candidate !== existing)]);
}

/** Drops the unpinned Clips beyond the newest 50. */
function keepNewest(clips: readonly Clip[]): Clip[] {
  let unpinned = 0;
  return clips.filter((clip) => clip.pinned || ++unpinned <= MAX_UNPINNED_CLIPS);
}

export function setPinned(clips: readonly Clip[], id: string, pinned: boolean): Clip[] {
  return clips.map((clip) => (clip.id === id ? { ...clip, pinned } : clip));
}

export function deleteClip(clips: readonly Clip[], id: string): Clip[] {
  return clips.filter((clip) => clip.id !== id);
}

export function clearUnpinned(clips: readonly Clip[]): Clip[] {
  return clips.filter((clip) => clip.pinned);
}

const TIMESTAMP = /^\d{9,13}$/;
const BASE64 = /^[A-Za-z0-9+/\-_]+={0,2}$/;
/** Text a person could read: no control characters other than whitespace, nothing unassigned or private. */
const READABLE = /^[\P{C}\t\n\r]+$/u;

/**
 * The Dev Utilities tab `text` can be opened in, checked in this order:
 * JSON (an object or array that parses), a Unix timestamp (9 to 13 digits),
 * then Base64 (8 or more Base64 characters that decode to readable UTF-8
 * text, so that ordinary words such as "password", which are valid Base64,
 * don't count). Undefined for anything else.
 */
export function clipKind(text: string): ClipKind | undefined {
  const trimmed = text.trim();
  if (isJson(trimmed)) return 'json';
  if (TIMESTAMP.test(trimmed)) return 'timestamp';
  if (isBase64(trimmed)) return 'base64';
  return undefined;
}

function isJson(text: string): boolean {
  if (!text.startsWith('{') && !text.startsWith('[')) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function isBase64(text: string): boolean {
  const compact = text.replace(/\s+/g, '');
  if (compact.length < 8 || !BASE64.test(compact)) return false;
  const decoded = decodeBase64(compact);
  return decoded.ok && READABLE.test(decoded.output);
}
