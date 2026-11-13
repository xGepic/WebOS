import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { describeCity, type WeatherCity } from '../../../core';
import { WebOSCore } from '../../webos-core';

/**
 * A city search for Settings: the user types a name, searches, and picks one
 * of up to five matches, shown with region and country since many names are
 * ambiguous. Used for the Weather city and the World Clock's cities.
 */
@Component({
  selector: 'webos-city-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (submit)="search(query.value, $event)">
      <label [for]="inputId()">{{ label() }}</label>
      <div class="row">
        <input
          #query
          class="text-field"
          type="search"
          autocomplete="off"
          spellcheck="false"
          maxlength="80"
          [id]="inputId()"
          [placeholder]="placeholder()"
        />
        <button type="submit" class="button" [disabled]="searching()">Search</button>
      </div>
    </form>
    @if (matches().length) {
      <ul class="matches" aria-label="Matching cities">
        @for (city of matches(); track $index) {
          <li>
            <button type="button" class="match" [disabled]="!selectable()(city)" (click)="choose(city); query.value = ''">
              {{ describe(city) }}
            </button>
          </li>
        }
      </ul>
    }
    @if (message(); as message) {
      <p class="hint" role="status">{{ message }}</p>
    }
  `,
  styleUrl: './city-search.css',
})
export class CitySearch {
  private readonly webos = inject(WebOSCore);
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly placeholder = input('');
  /** Whether a match can be picked; the others are shown, but disabled. */
  readonly selectable = input<(city: WeatherCity) => boolean>(() => true);
  /** The city the user picked. */
  readonly chosen = output<WeatherCity>();

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

  protected choose(city: WeatherCity): void {
    this.matches.set([]);
    this.message.set(undefined);
    this.chosen.emit(city);
  }
}
