import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MAX_WORLD_CLOCKS, describeCity, type WeatherCity, type WorldClockCity } from '../../../core';
import { WebOSCore } from '../../webos-core';

/**
 * Settings › World Clock: the cities the World Clock Widget shows, in order.
 * Cities are found with the same search as the Weather city, which gives
 * each one's time zone.
 */
@Component({
  selector: 'webos-world-clock-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="settings-world-clock">
      <h3 id="settings-world-clock" class="section-heading">World Clock</h3>
      @if (cities().length) {
        <ul class="list">
          @for (city of cities(); track city.id; let first = $first; let last = $last; let i = $index) {
            <li>
              <span class="name">{{ city.name }}<span class="zone">{{ city.timeZone }}</span></span>
              <button type="button" class="button icon-only" [disabled]="first" [attr.aria-label]="'Move ' + city.name + ' up'" (click)="move(city, i - 1)">↑</button>
              <button type="button" class="button icon-only" [disabled]="last" [attr.aria-label]="'Move ' + city.name + ' down'" (click)="move(city, i + 1)">↓</button>
              <button type="button" class="button danger" (click)="remove(city)">Remove</button>
            </li>
          }
        </ul>
      }
      @if (full()) {
        <p class="hint">The World Clock holds {{ max }} cities. Remove one to add another.</p>
      } @else {
        <form (submit)="search(query.value, $event)">
          <label for="settings-world-city">Add a city</label>
          <div class="row">
            <input
              #query
              id="settings-world-city"
              class="text-field"
              type="search"
              autocomplete="off"
              spellcheck="false"
              maxlength="80"
              placeholder="e.g. San Francisco"
            />
            <button type="submit" class="button" [disabled]="searching()">Search</button>
          </div>
        </form>
        @if (matches().length) {
          <ul class="matches" aria-label="Matching cities">
            @for (city of matches(); track $index) {
              <li>
                <button type="button" class="match" [disabled]="!city.timeZone" (click)="add(city); query.value = ''">
                  {{ describe(city) }}
                </button>
              </li>
            }
          </ul>
        }
      }
      @if (message(); as message) {
        <p class="hint" role="status">{{ message }}</p>
      }
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
    .list {
      margin: 0 0 1rem;
      padding: 0;
      list-style: none;
    }
    .list li {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.35rem 0.35rem 0.35rem 0.75rem;
      border-radius: var(--radius-inset);
      font-size: 0.875rem;
    }
    .list li:nth-child(odd) {
      background: var(--control-fill);
    }
    .name {
      flex: 1;
      min-width: 0;
    }
    .zone {
      margin-left: 0.5rem;
      color: var(--text-secondary);
      font-size: 0.75rem;
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
    .match:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .match:not(:disabled):hover,
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
export class WorldClockSettings {
  protected readonly webos = inject(WebOSCore);
  protected readonly max = MAX_WORLD_CLOCKS;
  protected readonly cities = computed(() => this.webos.worldClockCities() ?? []);
  protected readonly full = computed(() => this.cities().length >= MAX_WORLD_CLOCKS);
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

  protected async add(city: WeatherCity): Promise<void> {
    this.matches.set([]);
    const added = await this.webos.send((core) => core.worldClock.add(city));
    this.message.set(added ? undefined : `${city.name} is already on the World Clock.`);
  }

  protected move(city: WorldClockCity, toIndex: number): void {
    this.webos.send((core) => core.worldClock.move(city.id, toIndex));
  }

  protected remove(city: WorldClockCity): void {
    this.webos.send((core) => core.worldClock.delete(city.id));
  }
}
