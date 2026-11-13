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
        <div class="widget-empty">
          <p>See the time where your team is.</p>
          <button type="button" class="button" (click)="window.open('settings')">Add cities in Settings</button>
        </div>
      }
    }
  `,
  styleUrl: './world-clock-widget.css',
})
export class WorldClockWidget {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);
}
