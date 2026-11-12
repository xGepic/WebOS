import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/**
 * The World Clock Widget: the time in each city chosen in Settings, with its
 * day and how far it is from here. Cities where it is night are dimmed. At its
 * large size the cities sit side by side.
 */
@Component({
  selector: 'webos-world-clock-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('world-clock') }}</h2>
    @if (webos.worldClock(); as cities) {
      @if (cities.length) {
        <ul>
          @for (city of cities; track city.id) {
            <li [class.night]="!city.daytime">
              <span class="place">
                <span class="name">
                  {{ city.name }}
                  @if (city.day !== 'Today') {
                    <span class="day">{{ city.day }}</span>
                  }
                </span>
                <span class="detail">{{ city.day }}, {{ city.difference }}</span>
              </span>
              <time class="time">{{ city.time }}</time>
            </li>
          }
        </ul>
      } @else {
        <div class="empty">
          <p>See the time where your team is.</p>
          <button type="button" class="button" (click)="window.open('settings')">Add cities in Settings</button>
        </div>
      }
    }
  `,
  styles: `
    :host {
      container-type: size;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 1rem 0.75rem;
      border-radius: var(--radius-widget);
    }
    ul {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(12rem, 100%), 1fr));
      column-gap: 1.25rem;
      margin: 0;
      padding: 0 0.5rem;
      overflow: auto;
      list-style: none;
      scrollbar-width: thin;
    }
    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.3rem 0;
    }
    li.night {
      opacity: 0.6;
    }
    .place {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .name,
    .detail {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .name {
      font-size: 0.875rem;
      font-weight: 500;
    }
    .detail {
      color: var(--text-secondary);
      font-size: 0.75rem;
    }
    .time {
      flex: none;
      font-size: 1.25rem;
      font-weight: 300;
      letter-spacing: var(--tracking-title);
      font-variant-numeric: tabular-nums;
    }
    /* Narrow (small screens): a smaller time leaves the city's name more room. */
    @container (max-width: 14rem) {
      .time {
        font-size: 0.9375rem;
        font-weight: 400;
      }
    }
    /* The day is part of the detail line, except when there is no room for it. */
    .day {
      display: none;
    }
    /* Short (the small size): one line per city, so four fit. */
    @container (max-height: 13rem) {
      li {
        padding: 0.1rem 0;
      }
      .detail {
        display: none;
      }
      .day {
        display: inline;
        margin-left: 0.3rem;
        color: var(--text-secondary);
        font-size: 0.6875rem;
        font-weight: 400;
      }
      .time {
        font-size: 1rem;
      }
    }
    .empty {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 0.75rem;
      padding: 0 0.5rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    .empty p {
      margin: 0;
    }
  `,
})
export class WorldClockWidget {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);
}
