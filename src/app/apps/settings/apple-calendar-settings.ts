import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { WebOSCore } from '../../webos-core';

/** Why the last Connect didn't sign in, for the section to say. */
type Refusal = 'refused' | 'unreachable';

/**
 * Settings › Apple Calendar: sign in to iCloud with an Apple ID and an
 * app-specific password, choose which calendars the Calendar Widget shows,
 * sync now, and disconnect. Says plainly where the password is kept.
 */
@Component({
  selector: 'webos-apple-calendar-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="settings-apple-calendar">
      <h3 id="settings-apple-calendar" class="section-heading">Apple Calendar</h3>
      @if (webos.appleCalendar(); as status) {
        @if (status.connected) {
          <div class="current">
            <span>{{ status.appleId }}</span>
            <button type="button" class="button" (click)="disconnect()">Disconnect</button>
          </div>

          @if (status.calendars.length) {
            <fieldset>
              <legend>Show in the Calendar</legend>
              @for (calendar of status.calendars; track calendar.url) {
                <label class="calendar">
                  <input
                    type="checkbox"
                    class="checkbox"
                    [checked]="calendar.shown"
                    (change)="setShown(calendar.url, $event)"
                  />
                  <span class="swatch" aria-hidden="true" [style.background]="calendar.color"></span>
                  {{ calendar.name }}
                </label>
              }
            </fieldset>
          }

          <div class="sync">
            <p class="hint" role="status">
              @if (status.syncing) {
                Syncing…
              } @else if (status.problem === 'refused') {
                <span class="problem">Apple refused the password. It may have been revoked: disconnect and sign in with a new one.</span>
              } @else if (status.problem === 'failed') {
                <span class="problem">iCloud couldn’t be reached.</span>
                @if (status.syncedAt) {
                  Last synced {{ status.syncedAt }}.
                }
              } @else if (status.syncedAt) {
                Synced {{ status.syncedAt }}. A new tab syncs again after 15 minutes.
              }
            </p>
            <button type="button" class="button" [disabled]="status.syncing" (click)="sync()">Sync now</button>
          </div>
        } @else {
          <form (submit)="connect($event, appleId.value, password.value)">
            <label for="settings-apple-id">Apple ID</label>
            <input
              #appleId
              id="settings-apple-id"
              class="text-field"
              type="email"
              autocomplete="username"
              spellcheck="false"
              placeholder="name@icloud.com"
              required
            />
            <label for="settings-apple-password">App-specific password</label>
            <input
              #password
              id="settings-apple-password"
              class="text-field"
              type="password"
              autocomplete="off"
              spellcheck="false"
              placeholder="xxxx-xxxx-xxxx-xxxx"
              required
            />
            <div class="actions">
              <button type="submit" class="button" [disabled]="connecting()">
                {{ connecting() ? 'Connecting…' : 'Connect' }}
              </button>
              @if (refusal(); as refusal) {
                <p class="problem" role="alert">
                  {{
                    refusal === 'refused'
                      ? 'Apple refused this Apple ID and password. Check both, and use an app-specific password, not your Apple ID password.'
                      : 'iCloud couldn’t be reached. Check your connection and try again.'
                  }}
                </p>
              }
            </div>
          </form>
        }
      }
      <p class="hint">
        Shows your iCloud events in the Calendar Widget, read-only. Make an app-specific password at
        <a href="https://account.apple.com/account/manage" target="_blank" rel="noopener noreferrer">account.apple.com</a>
        under Sign-In and Security › App-Specific Passwords; your Apple ID password is never asked for. webOS keeps the
        app-specific password unencrypted in this browser's extension storage, and leaves it out of backups. You can
        revoke it there at any time.
      </p>
    </section>
  `,
  styles: `
    section {
      max-width: 26rem;
    }
    .section-heading {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      margin-bottom: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .text-field + label {
      margin-top: 0.75rem;
    }
    .actions {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
      margin-top: 0.875rem;
    }
    .current {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.5rem 0.5rem 0.5rem 0.75rem;
      border-radius: var(--radius-inset);
      background: var(--control-fill);
      font-size: 0.875rem;
    }
    fieldset {
      margin: 1rem 0 0;
      padding: 0;
      border: 0;
    }
    legend {
      margin-bottom: 0.375rem;
      padding: 0;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    label.calendar {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin: 0;
      padding: 0.3rem 0;
      color: var(--text-primary);
      font-size: 0.875rem;
      font-weight: 400;
      cursor: pointer;
    }
    .swatch {
      width: 0.625rem;
      height: 0.625rem;
      border-radius: var(--radius-pill);
    }
    .sync {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .sync .hint {
      margin: 0;
    }
    .problem {
      margin: 0;
      color: var(--danger);
      font-size: 0.8125rem;
    }
    .hint {
      margin-top: 1rem;
    }
    a {
      color: var(--accent);
    }
  `,
})
export class AppleCalendarSettings {
  protected readonly webos = inject(WebOSCore);
  protected readonly connecting = signal(false);
  protected readonly refusal = signal<Refusal | undefined>(undefined);

  protected async connect(event: Event, appleId: string, password: string): Promise<void> {
    event.preventDefault();
    this.connecting.set(true);
    this.refusal.set(undefined);
    const outcome = await this.webos.send((core) => core.appleCalendar.connect(appleId, password));
    this.connecting.set(false);
    if (outcome === 'refused' || outcome === 'unreachable') this.refusal.set(outcome);
    else if (outcome === undefined) this.refusal.set('unreachable');
  }

  protected setShown(calendarUrl: string, event: Event): void {
    const shown = (event.target as HTMLInputElement).checked;
    this.webos.send((core) => core.appleCalendar.setShown(calendarUrl, shown));
  }

  protected sync(): void {
    this.webos.send((core) => core.appleCalendar.sync());
  }

  protected disconnect(): void {
    this.refusal.set(undefined);
    this.webos.send((core) => core.appleCalendar.disconnect());
  }
}
