import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebOSCore } from '../../webos-core';

/** Settings › Profile: the name the Clock Widget greets the user with. Saved as you type. */
@Component({
  selector: 'webos-profile-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="settings-profile">
      <h3 id="settings-profile" class="section-heading">Profile</h3>
      <label for="settings-name">Your name</label>
      <input
        id="settings-name"
        class="text-field"
        type="text"
        autocomplete="given-name"
        maxlength="40"
        spellcheck="false"
        placeholder="Add your name"
        [value]="webos.name()"
        (input)="setName($event)"
      />
      <p class="hint">The Clock Widget greets you with it. Saved as you type.</p>
    </section>
  `,
  styles: `
    section {
      max-width: 26rem;
    }
    label {
      display: block;
      margin-bottom: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .hint {
      margin-top: 0.5rem;
    }
    .section-heading {
      margin-bottom: 1rem;
    }
  `,
})
export class ProfileSettings {
  protected readonly webos = inject(WebOSCore);

  protected setName(event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.webos.send((core) => core.profile.setName(name));
  }
}
