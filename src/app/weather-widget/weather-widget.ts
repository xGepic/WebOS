import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { ForecastDayView } from '../../core';
import { WindowState } from '../window/window-state';
import { WebOSCore } from '../webos-core';
import { WeatherIcon } from './weather-icon';

/**
 * The Weather Widget: the current temperature in the city chosen in Settings,
 * the condition in words with an icon, and today's high and low, in °C. Like
 * the Clock it has no surface: its type sits straight on the wallpaper.
 *
 * Clicking it turns it to the Forecast: today and the six days after, each
 * with its condition, any chance of rain or snow, and its low and high on a
 * bar spanning the week's range. Clicking again turns it back. Per tab: every
 * new tab starts on the current weather.
 */
@Component({
  selector: 'webos-weather-widget',
  imports: [WeatherIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (webos.weather(); as weather) {
      @if (weather.status === 'ready') {
        <!-- One button for the whole Widget, named for screen readers by what it shows and does. -->
        <button type="button" class="face" [attr.aria-label]="faceLabel()" (click)="showForecast.set(!showForecast())">
          @if (!showForecast()) {
            <span class="current" aria-hidden="true">
              <span class="place">{{ weather.city }}</span>
              <span class="now" [style.--digits]="digits(weather.temperature)">
                <webos-weather-icon class="icon" [condition]="weather.condition" [isDay]="weather.isDay" />
                <span class="temperature">{{ weather.temperature }}°</span>
              </span>
              <span class="details">
                {{ weather.label }}
                <span class="range">H {{ weather.high }}° · L {{ weather.low }}°</span>
              </span>
              @if (weather.updatedAt) {
                <span class="updated">Updated {{ weather.updatedAt }}</span>
              }
            </span>
          } @else if (weather.days.length) {
            <span class="forecast" aria-hidden="true">
              <span class="place forecast-place">{{ weather.city }}</span>
              @for (day of weather.days; track day.date) {
                <span class="day" [class.today]="$first" [title]="day.label">
                  <span class="day-name">{{ day.day }}</span>
                  <webos-weather-icon class="day-icon" [condition]="day.condition" [isDay]="true" />
                  <span class="rain">{{ day.rainChance ? day.rainChance + '%' : '' }}</span>
                  <span class="low">{{ day.low }}°</span>
                  <span class="bar"><span class="fill" [style.left.%]="barStart(day)" [style.right.%]="barEnd(day)"></span></span>
                  <span class="high">{{ day.high }}°</span>
                </span>
              }
            </span>
          } @else {
            <span class="current" aria-hidden="true">
              <span class="place">{{ weather.city }}</span>
              <span class="message">Loading the forecast…</span>
            </span>
          }
        </button>
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

  /** Whether the Forecast shows instead of the current weather. */
  protected readonly showForecast = signal(false);

  private readonly days = computed(() => {
    const weather = this.webos.weather();
    return weather?.status === 'ready' ? weather.days : [];
  });
  /** The week's lowest low and highest high, which the bars span. */
  private readonly span = computed(() => {
    const days = this.days();
    const low = Math.min(...days.map((day) => day.low));
    const high = Math.max(...days.map((day) => day.high));
    return { low, size: Math.max(1, high - low) };
  });

  /** What the face says to a screen reader: everything it shows, then what clicking does. */
  protected readonly faceLabel = computed(() => {
    const weather = this.webos.weather();
    if (weather?.status !== 'ready') return null;
    if (!this.showForecast()) {
      const updated = weather.updatedAt ? ` Updated ${weather.updatedAt}.` : '';
      return `${weather.city}, ${weather.temperature}°, ${weather.label}. High ${weather.high}°, low ${weather.low}°.${updated} Show the forecast`;
    }
    const days = weather.days.map((day) => {
      const rain = day.rainChance ? `, ${day.rainChance}% chance of ${day.condition === 'snow' ? 'snow' : 'rain'}` : '';
      return `${day.dayName}: ${day.label}, high ${day.high}°, low ${day.low}°${rain}.`;
    });
    return `Forecast for ${weather.city}. ${days.join(' ')} Show the current weather`;
  });

  /** Characters in the temperature, at least two, so 3° and 23° are one size and only -12° shrinks to fit. */
  protected digits(temperature: number): number {
    return Math.max(2, String(temperature).length);
  }

  /** How far into the week's range the day's low is, in percent. */
  protected barStart(day: ForecastDayView): number {
    const { low, size } = this.span();
    return ((day.low - low) / size) * 100;
  }

  /** How far short of the week's highest the day's high is, in percent. */
  protected barEnd(day: ForecastDayView): number {
    const { low, size } = this.span();
    return 100 - ((day.high - low) / size) * 100;
  }
}
