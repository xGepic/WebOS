import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MAX_WORLD_CLOCKS, type WeatherCity, type WorldClockCity } from '../../../core';
import { WebOSCore } from '../../webos-core';
import { CitySearch } from './city-search';

/**
 * Settings › World Clock: the cities the World Clock Widget shows, in order.
 * Cities are found with the same search as the Weather city, which gives
 * each one's time zone.
 */
@Component({
  selector: 'webos-world-clock-settings',
  imports: [CitySearch],
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
        <!-- A city needs a time zone to be shown; matches without one can't be picked. -->
        <webos-city-search
          inputId="settings-world-city"
          label="Add a city"
          placeholder="e.g. San Francisco"
          [selectable]="hasTimeZone"
          (chosen)="add($event)"
        />
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
  protected readonly message = signal<string | undefined>(undefined);
  protected readonly hasTimeZone = (city: WeatherCity) => !!city.timeZone;

  protected async add(city: WeatherCity): Promise<void> {
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
