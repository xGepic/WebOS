import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { StateDocumentError, type BackupFile } from '../../../core';
import { WebOSCore } from '../../webos-core';

/** How the last import went, for the section to say. */
type Outcome = { kind: 'imported'; fileName: string } | { kind: 'failed'; reason: string };

/**
 * Settings › Backup: export all webOS data to a JSON file, and import one
 * again, here or on another machine. An import replaces everything, so it asks
 * first; a file webOS can't use is rejected with the reason, and nothing changes.
 */
@Component({
  selector: 'webos-backup-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="settings-backup">
      <h3 id="settings-backup" class="section-heading">Backup</h3>
      <p class="hint">
        Save all your webOS data (Links, Todos, Notes, the Desktop layout and your settings) to a file, and bring it
        back later or on another machine.
      </p>
      <div class="actions">
        <button type="button" class="button" (click)="exportBackup()">Export</button>
        <button type="button" class="button" (click)="fileInput.click()">Import…</button>
        <input
          #fileInput
          type="file"
          accept="application/json,.json"
          hidden
          (change)="readBackupFile(fileInput)"
        />
      </div>

      @if (chosen(); as file) {
        <div class="confirm" role="alert">
          <p>
            Replace <strong>all</strong> your webOS data with “{{ file.fileName }}”? This can't be undone, so export first
            if you might want what you have now.
          </p>
          <div class="confirm-actions">
            <button type="button" class="button danger" (click)="importChosen(file)">Replace</button>
            <button type="button" class="button" (click)="chosen.set(undefined)">Cancel</button>
          </div>
        </div>
      }

      @if (outcome(); as outcome) {
        @if (outcome.kind === 'imported') {
          <p class="outcome" role="status">Imported “{{ outcome.fileName }}”.</p>
        } @else {
          <p class="outcome failed" role="alert">Nothing was imported. {{ outcome.reason }}</p>
        }
      }
    </section>
  `,
  styles: `
    section {
      max-width: 32rem;
    }
    .section-heading {
      margin-bottom: 0.5rem;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .confirm {
      margin-top: 1rem;
      padding: 0.875rem 1rem;
      border: 1px solid var(--material-border);
      border-radius: var(--radius-inset);
      background: var(--control-fill);
      font-size: 0.875rem;
    }
    .confirm p {
      margin: 0;
    }
    .confirm-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .outcome {
      margin: 1rem 0 0;
      font-size: 0.875rem;
    }
    .outcome.failed {
      color: var(--danger);
    }
  `,
})
export class BackupSettings {
  private readonly webos = inject(WebOSCore);

  /** A backup file chosen for import, waiting for the user to confirm. */
  protected readonly chosen = signal<BackupFile | undefined>(undefined);
  protected readonly outcome = signal<Outcome | undefined>(undefined);

  /** Downloads a backup file of all webOS data. */
  protected exportBackup(): void {
    const backup = this.webos.exportBackup();
    if (!backup) return;
    const url = URL.createObjectURL(new Blob([backup.text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = backup.fileName;
    link.click();
    // The download has started from the URL; it can go once the click has been handled.
    setTimeout(() => URL.revokeObjectURL(url));
  }

  /** Reads the chosen file and asks to confirm replacing everything with it. */
  protected async readBackupFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    // Cleared, so choosing the same file again still counts as a change.
    input.value = '';
    if (!file) return;
    this.outcome.set(undefined);
    try {
      this.chosen.set({ fileName: file.name, text: await file.text() });
    } catch (error) {
      console.error('webOS could not read the backup file', error);
      this.outcome.set({ kind: 'failed', reason: 'The file could not be read.' });
    }
  }

  protected async importChosen(file: BackupFile): Promise<void> {
    this.chosen.set(undefined);
    try {
      await this.webos.importBackup(file.text);
      this.outcome.set({ kind: 'imported', fileName: file.fileName });
    } catch (error) {
      if (error instanceof StateDocumentError) {
        this.outcome.set({ kind: 'failed', reason: error.message });
      } else {
        console.error('webOS could not import a backup', error);
        this.outcome.set({ kind: 'failed', reason: 'It could not be saved.' });
      }
    }
  }
}
