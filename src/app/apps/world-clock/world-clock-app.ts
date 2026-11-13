import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MAX_WORLD_CLOCKS, type WeatherCity, type WorldClockCity } from '../../../core';
import { WebOSCore } from '../../webos-core';
import { CitySearch } from '../settings/city-search';

/**
 * The World Clock App, opened from the World Clock Widget: the cities the
 * Widget shows, in order, each with its time now, to reorder and remove, and
 * a search to add more. Cities are found with the same search as the Weather
 * city in Settings, which gives each one's time zone.
 */
@Component({
  selector: 'webos-world-clock-app',
  imports: [CitySearch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cities().length) {
      <ul class="list" aria-label="World Clock cities">
        @for (city of cities(); track city.id; let first = $first; let last = $last; let i = $index) {
          <li [class.night]="!city.daytime">
            <span class="place">
              <span class="name">{{ city.name }}</span>
              <span class="detail">{{ city.day }}, {{ city.difference }} · {{ city.timeZone }}</span>
            </span>
            <time class="time">{{ city.time }}</time>
            <button type="button" class="button icon-only" [disabled]="first" [attr.aria-label]="'Move ' + city.name + ' up'" (click)="move(city, i - 1)">↑</button>
            <button type="button" class="button icon-only" [disabled]="last" [attr.aria-label]="'Move ' + city.name + ' down'" (click)="move(city, i + 1)">↓</button>
            <button type="button" class="button danger" (click)="remove(city)">Remove</button>
          </li>
        }
      </ul>
    } @else {
      <p class="hint">No cities yet. Add the places where your team or family is.</p>
    }

    <div>
      @if (full()) {
        <p class="hint">The World Clock holds {{ max }} cities. Remove one to add another.</p>
      } @else {
        <!-- A city needs a time zone to be shown; matches without one can't be picked. -->
        <webos-city-search
          inputId="world-clock-city"
          label="Add a city"
          placeholder="e.g. San Francisco"
          [selectable]="hasTimeZone"
          (chosen)="add($event)"
        />
      }
      @if (message(); as message) {
        <p class="hint message" role="status">{{ message }}</p>
      }
    </div>

    <p class="hint">Cities where it is night are dimmed, here and on the Widget.</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
      max-width: 36rem;
      padding: 1.5rem 1.75rem 2rem;
    }
    .list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.45rem 0.35rem 0.45rem 0.75rem;
      border-radius: var(--radius-inset);
      font-size: 0.875rem;
    }
    li:nth-child(odd) {
      background: var(--control-fill);
    }
    li.night .place,
    li.night .time {
      opacity: 0.6;
    }
    .place {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
    }
    .detail {
      overflow: hidden;
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .time {
      margin-right: 0.5rem;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .hint {
      margin: 0;
    }
    .message {
      margin-top: 0.5rem;
    }
  `,
})
export class WorldClockApp {
  protected readonly webos = inject(WebOSCore);
  protected readonly max = MAX_WORLD_CLOCKS;
  /** The cities in order, each with its time now. */
  protected readonly cities = computed(() => this.webos.worldClock() ?? []);
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
