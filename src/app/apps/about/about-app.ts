import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { extensionVersion } from '../../../edges/extension-info';
import { WebOSCore } from '../../webos-core';
import { saveBackup } from '../settings/save-backup';

/**
 * About webOS, opened from the webOS mark in the Menu Bar: the version, the
 * data webOS keeps and the storage it takes, and when it was last backed up,
 * with a nudge to export once that is 30 days ago or more, or never.
 */
@Component({
  selector: 'webos-about-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="identity">
      <!-- The webOS mark, as in the Menu Bar. -->
      <svg viewBox="0 0 16 16" width="64" height="64" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.1" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5a2 6.25 0 0 0 0-12.5z" fill="currentColor" />
      </svg>
      <h3 class="name">webOS</h3>
      <p class="version">{{ version ? 'Version ' + version : 'Development build' }}</p>
    </div>

    @if (webos.about(); as about) {
      <dl class="facts">
        <div>
          <dt>Your data</dt>
          <dd>{{ contents() }}</dd>
        </div>
        <div>
          <dt>Storage used</dt>
          <dd>{{ about.storage }}</dd>
        </div>
        <div>
          <dt>Data format</dt>
          <dd>Schema {{ about.schemaVersion }}</dd>
        </div>
        <div>
          <dt>Last backup</dt>
          <dd [class.due]="about.backupDue">{{ about.lastBackup }}</dd>
        </div>
      </dl>

      @if (about.backupDue) {
        <div class="nudge" role="status">
          <p>
            @if (about.lastBackup === 'Never') {
              You haven’t backed up webOS yet.
            } @else {
              Your last backup was {{ about.lastBackup }}.
            }
            Everything lives only in this browser, so export a copy now and then.
          </p>
          <button type="button" class="button" (click)="exportBackup()">Export a backup</button>
        </div>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      padding: 3rem 1.75rem 2rem;
    }
    .identity {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }
    .name {
      margin: 0.75rem 0 0;
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: var(--tracking-title);
    }
    .version {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-variant-numeric: tabular-nums;
    }
    .facts {
      display: grid;
      gap: 0.5rem;
      width: min(26rem, 100%);
      margin: 0;
      font-size: 0.875rem;
    }
    .facts > div {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }
    dt {
      color: var(--text-secondary);
    }
    dd {
      margin: 0;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .due {
      color: var(--danger);
    }
    .nudge {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
      width: min(26rem, 100%);
      padding: 0.875rem 1rem;
      border: 1px solid var(--material-border);
      border-radius: var(--radius-inset);
      background: var(--control-fill);
      font-size: 0.875rem;
    }
    .nudge p {
      margin: 0;
    }
  `,
})
export class AboutApp {
  protected readonly webos = inject(WebOSCore);
  protected readonly version = extensionVersion();

  /** What webOS keeps, counted: "4 Notes · 7 Todos · 12 Clips · 2 Countdowns". */
  protected readonly contents = computed(() => {
    const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
    const todos = (this.webos.openTodos()?.length ?? 0) + (this.webos.completedTodos()?.length ?? 0);
    return [
      count(this.webos.notes()?.length ?? 0, 'Note'),
      count(todos, 'Todo'),
      count(this.webos.clips()?.length ?? 0, 'Clip'),
      count(this.webos.countdowns()?.length ?? 0, 'Countdown'),
    ].join(' · ');
  });

  protected exportBackup(): void {
    saveBackup(this.webos);
  }
}
