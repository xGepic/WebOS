import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LinksSettings } from './links-settings';
import { ProfileSettings } from './profile-settings';

/** The Settings App: one place to configure webOS, one section per topic. */
@Component({
  selector: 'webos-settings-app',
  imports: [ProfileSettings, LinksSettings],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <webos-profile-settings />
    <webos-links-settings />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 2.25rem;
      padding: 1.5rem 1.75rem 2rem;
    }
  `,
})
export class SettingsApp {}
