import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WindowState } from '../window/window-state';
import { WebOSCore } from '../webos-core';
import { WeatherIcon } from './weather-icon';

/**
 * The Weather Widget: the current temperature in the city chosen in Settings,
 * the condition in words with an icon, and today's high and low, in °C. Like
 * the Clock it has no surface: its type sits straight on the wallpaper.
 */
@Component({
  selector: 'webos-weather-widget',
  imports: [WeatherIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (webos.weather(); as weather) {
      @if (weather.status === 'ready') {
        <p class="place">{{ weather.city }}</p>
        <p class="now">
          <webos-weather-icon class="icon" [condition]="weather.condition" [isDay]="weather.isDay" />
          <span class="temperature">{{ weather.temperature }}°</span>
        </p>
        <p class="details">
          {{ weather.label }}
          <span class="range">H {{ weather.high }}° · L {{ weather.low }}°</span>
        </p>
        @if (weather.updatedAt) {
          <p class="updated">Updated {{ weather.updatedAt }}</p>
        }
      } @else if (weather.status === 'no-city') {
        <p class="message">See the weather for your city here.</p>
        <button type="button" class="button" (click)="window.open('settings')">Choose a city</button>
      } @else if (weather.status === 'loading' || weather.status === 'unavailable') {
        <p class="place">{{ weather.city }}</p>
        <p class="message">{{ weather.status === 'loading' ? 'Loading the weather…' : 'The weather is unavailable right now.' }}</p>
      }
    }
  `,
  styleUrl: './weather-widget.css',
})
export class WeatherWidget {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);
}
