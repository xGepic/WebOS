import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BackupSettings } from './backup-settings';
import { GitHubSettings } from './github-settings';
import { LinksSettings } from './links-settings';
import { ProfileSettings } from './profile-settings';
import { WeatherSettings } from './weather-settings';
import { WorldClockSettings } from './world-clock-settings';

/** The Settings App: one place to configure webOS, one section per topic. */
@Component({
  selector: 'webos-settings-app',
  imports: [
    ProfileSettings,
    WeatherSettings,
    WorldClockSettings,
    LinksSettings,
    GitHubSettings,
    BackupSettings,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <webos-profile-settings />
    <webos-weather-settings />
    <webos-world-clock-settings />
    <webos-links-settings />
    <webos-github-settings />
    <webos-backup-settings />
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
