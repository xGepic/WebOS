import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { WeatherCondition } from '../../core';

/**
 * A weather condition as a small line icon in the text colour. Original
 * artwork, drawn on a 24-unit grid.
 */
@Component({
  selector: 'webos-weather-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 24 24">
      @switch (condition()) {
        @case ('clear') {
          @if (isDay()) {
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
          } @else {
            <path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z" />
          }
        }
        @case ('partly-cloudy') {
          @if (isDay()) {
            <path d="M8.5 3v1.4M3.4 5.1l1 1M1.8 10h1.4M13.6 5.1l-1 1" />
            <path d="M5.4 12.6a3.6 3.6 0 0 1 6.5-3.4" />
          } @else {
            <path d="M11.6 7.4A4.6 4.6 0 0 1 5.2 3.2a4.6 4.6 0 0 0 1.1 8.4" />
          }
          <path d="M9.8 20.5h7.6a3.6 3.6 0 0 0 .4-7.2 5 5 0 0 0-9.4 1.3 3 3 0 0 0 1.4 5.9z" />
        }
        @case ('cloudy') {
          <path d="M7.3 18.5h9.6a4.1 4.1 0 0 0 .5-8.2 5.7 5.7 0 0 0-10.9 1.5 3.4 3.4 0 0 0 .8 6.7z" />
        }
        @case ('fog') {
          <path d="M7.3 12.5h9.6a3.6 3.6 0 0 0 .4-7.2 5 5 0 0 0-9.6 1.2" />
          <path d="M3.5 15.5h17M5.5 19h13" />
        }
        @default {
          <!-- Cloud over precipitation -->
          <path d="M7.3 14.5h9.6a3.8 3.8 0 0 0 .4-7.6 5.3 5.3 0 0 0-10.2 1.4 3.1 3.1 0 0 0 .2 6.2z" />
          @switch (condition()) {
            @case ('drizzle') {
              <path d="M8.5 17.5v.6M12 17.5v.6M15.5 17.5v.6M10.2 20.5v.6M13.8 20.5v.6" />
            }
            @case ('snow') {
              <path class="dots" d="M8.5 17.8h.01M12 17.8h.01M15.5 17.8h.01M10.2 20.8h.01M13.8 20.8h.01" />
            }
            @case ('thunderstorm') {
              <path d="M12.6 16.5l-2.2 3.2h3.2l-2.2 3.3" />
            }
            @case ('showers') {
              <path d="M8.6 17l-1 4.5M12.6 17l-1 4.5M16.6 17l-1 4.5" />
            }
            @default {
              <path d="M8.8 17l-.8 3M12.8 17l-.8 3M16.8 17l-.8 3" />
            }
          }
        }
      }
    </svg>
  `,
  styleUrl: './weather-icon.css',
})
export class WeatherIcon {
  readonly condition = input.required<WeatherCondition>();
  readonly isDay = input(true);
}
