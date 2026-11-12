import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { describeCity, type WeatherCity } from '../../../core';
import { WebOSCore } from '../../webos-core';

/**
 * Settings › Weather: the city the Weather Widget shows. The user searches,
 * then picks one of up to five matches, since many names are ambiguous.
 */
@Component({
  selector: 'webos-weather-settings',
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
      <form (submit)="search(query.value, $event)">
        <label for="settings-city">{{ webos.weatherCity() ? 'Change city' : 'Your city' }}</label>
        <div class="row">
          <input
            #query
            id="settings-city"
            class="text-field"
            type="search"
            autocomplete="off"
            spellcheck="false"
            maxlength="80"
            placeholder="e.g. Vienna"
          />
          <button type="submit" class="button" [disabled]="searching()">Search</button>
        </div>
      </form>
      @if (matches().length) {
        <ul class="matches" aria-label="Matching cities">
          @for (city of matches(); track $index) {
            <li>
              <button type="button" class="match" (click)="choose(city); query.value = ''">{{ describe(city) }}</button>
            </li>
          }
        </ul>
      }
      @if (message(); as message) {
        <p class="hint" role="status">{{ message }}</p>
      }
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
    label {
      display: block;
      margin-bottom: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
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
    .row {
      display: flex;
      gap: 0.5rem;
    }
    .matches {
      margin: 0.5rem 0 0;
      padding: 0;
      list-style: none;
    }
    .match {
      display: block;
      width: 100%;
      padding: 0.45rem 0.7rem;
      border: 0;
      border-radius: var(--radius-control);
      background: none;
      color: var(--text-primary);
      font: inherit;
      font-size: 0.875rem;
      text-align: left;
      cursor: pointer;
    }
    .match:hover,
    .match:focus-visible {
      background: var(--selected-fill);
      outline: none;
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
  protected readonly matches = signal<WeatherCity[]>([]);
  protected readonly searching = signal(false);
  protected readonly message = signal<string | undefined>(undefined);
  protected readonly describe = describeCity;

  protected async search(query: string, event: Event): Promise<void> {
    event.preventDefault();
    const typed = query.trim();
    this.matches.set([]);
    this.message.set(undefined);
    if (!typed) return;
    this.searching.set(true);
    try {
      const cities = await this.webos.searchCities(typed);
      this.matches.set(cities);
      if (!cities.length) this.message.set(`No city called “${typed}” was found.`);
    } catch {
      this.message.set("Couldn't search right now. Check your connection and try again.");
    } finally {
      this.searching.set(false);
    }
  }

  protected choose(city: WeatherCity | null): void {
    this.matches.set([]);
    this.message.set(undefined);
    this.webos.send((core) => core.weather.setCity(city));
  }
}
