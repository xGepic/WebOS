import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/**
 * The World Clock Widget: the time in each city on the World Clock, with its
 * day and how far it is from here. Cities where it is night are dimmed. At its
 * large size the cities sit side by side. Clicking it opens the World Clock
 * App, which springs out of this Widget, to add, reorder and remove cities.
 */
@Component({
  selector: 'webos-world-clock-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('world-clock') }}</h2>
    @if (webos.worldClock(); as cities) {
      @if (cities.length) {
        <!-- A click anywhere opens the World Clock App; the list stays scrollable above the control. -->
        <button type="button" class="widget-open" aria-label="Edit World Clock cities" (click)="window.open('world-clock')"></button>
        <ul class="widget-open-above" (click)="window.open('world-clock')">
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
          <button type="button" class="button" (click)="window.open('world-clock')">Add cities</button>
        </div>
      }
    }
  `,
  styleUrl: './world-clock-widget.css',
})
export class WorldClockWidget {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    this.window.registerOrigin('world-clock', element);
    inject(DestroyRef).onDestroy(() => this.window.unregisterOrigin('world-clock', element));
  }
}
