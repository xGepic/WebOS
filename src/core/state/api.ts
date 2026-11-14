import type { Store } from '../store';
import * as backup from './backup';

export interface BackupApi {
  /** Export to, and import from, a backup file holding all webOS data. */
  readonly backup: {
    /** A backup file of all webOS data: its suggested file name and its JSON text. */
    export(): backup.BackupFile;
    /**
     * Replaces all webOS data with a backup file's, as a whole, bringing an
     * older backup forward to this build's schema. Rejects with a
     * `StateDocumentError` saying what is wrong, without touching anything, if
     * the file isn't a backup this build can use. This machine's Apple
     * Calendar connection is kept: backups never hold it.
     */
    import(text: string): Promise<void>;
  };
}

export function createBackup(store: Store): BackupApi {
  return {
    backup: {
      export: () => backup.exportFile(store.state(), store.clock.now()),
      async import(text) {
        await store.replace({ ...backup.importDocument(text), appleCalendar: store.state().appleCalendar });
      },
    },
  };
}
