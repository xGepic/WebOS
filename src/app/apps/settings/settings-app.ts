import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebOSCore } from '../../webos-core';

/** The Settings App. For now it holds the name the Clock Widget greets the user with. */
@Component({
  selector: 'webos-settings-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="settings-profile">
      <h3 id="settings-profile">Profile</h3>
      <label for="settings-name">Your name</label>
      <input
        id="settings-name"
        type="text"
        autocomplete="given-name"
        maxlength="40"
        spellcheck="false"
        placeholder="Add your name"
        [value]="webos.name()"
        (input)="webos.setName($any($event.target).value)"
      />
      <p class="hint">The Clock Widget greets you with it. Saved as you type.</p>
    </section>
  `,
  styles: `
    :host {
      display: block;
      padding: 1.5rem 1.75rem;
    }
    section {
      max-width: 26rem;
    }
    h3 {
      margin: 0 0 1rem;
      font-size: 1.25rem;
      font-weight: 650;
      letter-spacing: var(--tracking-title);
    }
    label {
      display: block;
      margin-bottom: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      padding: 0.55rem 0.75rem;
      border: 1px solid var(--material-border);
      border-radius: 0.5rem;
      background: var(--control-fill);
      color: var(--text-primary);
      font: inherit;
      font-size: 0.9375rem;
    }
    input::placeholder {
      color: var(--text-secondary);
      opacity: 0.6;
    }
    input:focus {
      outline: 2px solid var(--focus-ring);
      outline-offset: 1px;
    }
    .hint {
      margin: 0.5rem 0 0;
      color: var(--text-secondary);
      font-size: 0.8125rem;
    }
  `,
})
export class SettingsApp {
  protected readonly webos = inject(WebOSCore);
}
