import type { Store } from '../store';
import * as about from './about';
import * as backup from './backup';

/** What can be done with the stored state as a whole: backing it up, and seeing what it holds in About webOS. */
export interface StateApi {
  /** Export to, and import from, a backup file holding all webOS data. */
  readonly backup: {
    /** A backup file of all webOS data: its suggested file name and its JSON text. Counts as the last backup, for About webOS. */
    export(): backup.BackupFile;
    /**
     * Replaces all webOS data with a backup file's, as a whole, bringing an
     * older backup forward to this build's schema. Rejects with a
     * `StateDocumentError` saying what is wrong, without touching anything, if
     * the file isn't a backup this build can use. This machine's Apple
     * Calendar connection is kept: backups never hold it. So is when this
     * machine last exported a backup.
     */
    import(text: string): Promise<void>;
  };
  /** What About webOS shows of the stored data. */
  readonly about: {
    view(): about.AboutView;
  };
}

export function createState(store: Store): StateApi {
  return {
    backup: {
      export() {
        const now = store.clock.now();
        const file = backup.exportFile(store.state(), now);
        // The change shows at once; the file is already made, so a failed save only loses the date.
        store.commit({ ...store.state(), lastBackupAt: now.getTime() }).catch((error) => {
          console.error('webOS could not save when the last backup was', error);
        });
        return file;
      },
      async import(text) {
        const { appleCalendar, lastBackupAt } = store.state();
        await store.replace({ ...backup.importDocument(text), appleCalendar, lastBackupAt });
      },
    },
    about: {
      view: () => about.aboutView(store.state(), store.clock.now()),
    },
  };
}
