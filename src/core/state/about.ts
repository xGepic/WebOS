import { daysFrom } from '../time/calendar';
import type { StateDocument } from './state';

/** What About webOS shows of the stored data. */
export interface AboutView {
  /** The version of the state document's schema. */
  schemaVersion: number;
  /** How much storage the data takes, e.g. "48 KB" or "2.1 MB". */
  storage: string;
  /** When a backup was last exported here: "Never", "Today", "Yesterday" or "12 days ago". */
  lastBackup: string;
  /** Whether a backup is due: there has been none, or the last is 30 days old or more. */
  backupDue: boolean;
}

/** A backup is due once the last one is this many days old. */
const BACKUP_DUE_AFTER_DAYS = 30;

/** A size in bytes in words: "512 bytes", "48 KB", "2.1 MB". */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** About webOS for `document` at `now`. Its storage is measured as the JSON it is stored as. */
export function aboutView(document: StateDocument, now: Date): AboutView {
  const bytes = new TextEncoder().encode(JSON.stringify(document)).length;
  const days = document.lastBackupAt === null ? undefined : daysFrom(new Date(document.lastBackupAt), now);
  return {
    schemaVersion: document.schemaVersion,
    storage: formatSize(bytes),
    lastBackup: days === undefined ? 'Never' : days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`,
    backupDue: days === undefined || days >= BACKUP_DUE_AFTER_DAYS,
  };
}
