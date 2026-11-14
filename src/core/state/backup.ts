import { NO_APPLE_CALENDAR } from '../time/apple-calendar';
import { StateDocumentError, assertValidContents, toCurrentDocument, type StateDocument } from './state';

/** What every StateDocumentError about a backup file calls it. */
const BACKUP_FILE = 'This file';

/** A backup of all webOS data: the suggested file name, and the file's JSON text. */
export interface BackupFile {
  fileName: string;
  text: string;
}

/**
 * A backup file of `document`, named after the local date `now`: `webos-backup-2026-11-12.json`.
 * The cached weather is left out: it is stale by the time the file is used.
 * So is Apple Calendar, which holds the account's password.
 */
export function exportFile(document: StateDocument, now: Date): BackupFile {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    fileName: `webos-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`,
    text: JSON.stringify(
      { ...document, weather: { ...document.weather, report: null }, appleCalendar: NO_APPLE_CALENDAR },
      null,
      2,
    ),
  };
}

/**
 * The state document in a backup file's text, brought forward to the current
 * schema. Throws a `StateDocumentError` saying what is wrong if it isn't a
 * backup this build can use.
 */
export function importDocument(text: string): StateDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new StateDocumentError(`${BACKUP_FILE} isn't valid JSON, so it isn't a webOS backup.`);
  }
  // Stored state from before schema versions counts as version 0, which migrates to empty
  // data. A file without a version, or with version 0, is just some JSON: importing it that
  // way would wipe everything.
  const version = typeof parsed === 'object' && parsed !== null ? (parsed as { schemaVersion?: unknown }).schemaVersion : undefined;
  if (Array.isArray(parsed) || version === undefined || version === 0) {
    throw new StateDocumentError(`${BACKUP_FILE} isn't a webOS backup.`);
  }
  const document = toCurrentDocument(parsed, BACKUP_FILE);
  assertValidContents(document, BACKUP_FILE);
  return {
    ...document,
    // Any weather in the file is stale; the next refresh fetches it fresh.
    weather: { ...document.weather, report: null },
  };
}
