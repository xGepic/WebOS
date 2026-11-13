import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { describeCity, type WeatherCity } from '../../../core';
import { WebOSCore } from '../../webos-core';
import { CitySearch } from './city-search';

/**
 * Settings › Weather: the city the Weather Widget shows. The user searches,
 * then picks one of up to five matches, since many names are ambiguous.
 */
@Component({
  selector: 'webos-weather-settings',
  imports: [CitySearch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="settings-weather">
      <h3 id="settings-weather" class="section-heading">Weather</h3>
      @if (webos.weatherCity(); as city) {
        <div class="current">
          <span>{{ describe(city) }}</span>
          <button type="button" class="button" (click)="choose(null)">Remove</button>
        </div>
      }
      <webos-city-search
        inputId="settings-city"
        placeholder="e.g. Vienna"
        [label]="webos.weatherCity() ? 'Change city' : 'Your city'"
        (chosen)="choose($event)"
      />
      <p class="hint">
        The Weather Widget shows it in °C, from Open-Meteo. Only the city's coordinates are sent. The Sun and Moon
        Widgets use this city too; they are worked out on this machine.
      </p>
    </section>
  `,
  styles: `
    section {
      max-width: 26rem;
    }
    .current {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding: 0.5rem 0.5rem 0.5rem 0.75rem;
      border-radius: var(--radius-inset);
      background: var(--control-fill);
      font-size: 0.875rem;
    }
    .hint {
      margin-top: 0.5rem;
    }
    .section-heading {
      margin-bottom: 1rem;
    }
  `,
})
export class WeatherSettings {
  protected readonly webos = inject(WebOSCore);
  protected readonly describe = describeCity;

  protected choose(city: WeatherCity | null): void {
    this.webos.send((core) => core.weather.setCity(city));
  }
}
