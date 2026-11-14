import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppleCalendarSettings } from './apple-calendar-settings';
import { BackupSettings } from './backup-settings';
import { ProfileSettings } from './profile-settings';
import { SystemSettings } from './system-settings';
import { WeatherSettings } from './weather-settings';

/** The Settings App: one place to configure webOS, one section per topic. */
@Component({
  selector: 'webos-settings-app',
  imports: [
    ProfileSettings,
    WeatherSettings,
    AppleCalendarSettings,
    SystemSettings,
    BackupSettings,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <webos-profile-settings />
    <webos-weather-settings />
    <webos-apple-calendar-settings />
    <webos-system-settings />
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
