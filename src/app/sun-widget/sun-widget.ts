import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/** The arc the sun travels, in the SVG's own units: from the left horizon to the right. */
const ARC = { left: 12, right: 188, horizon: 66, height: 54 };

/**
 * The Sun Widget: today's sunrise and sunset in the Weather city, the length
 * of the day and how it compares with yesterday, and the sun on its arc.
 * Computed locally, so it works offline.
 */
@Component({
  selector: 'webos-sun-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('sun') }}</h2>
    @if (webos.sun(); as sun) {
      @if (sun.status === 'no-city') {
        <div class="widget-empty">
          <p>See sunrise and sunset for your city here.</p>
          <button type="button" class="button" (click)="window.open('settings')">Choose a city</button>
        </div>
      } @else if (sun.kind === 'day') {
        <div class="body">
          <svg class="arc" viewBox="0 0 200 74" aria-hidden="true">
            <line class="horizon" [attr.x1]="0" [attr.x2]="200" [attr.y1]="arc.horizon" [attr.y2]="arc.horizon" />
            <path class="path" [attr.d]="arcPath(1)" />
            @if (position(); as at) {
              <path class="travelled" [attr.d]="arcPath(at.progress)" />
              <circle class="sun" [attr.cx]="at.x" [attr.cy]="at.y" r="6" />
            }
          </svg>
          <div class="times">
            <p><span class="label">Sunrise</span> {{ sun.sunrise }}</p>
            <p class="end"><span class="label">Sunset</span> {{ sun.sunset }}</p>
          </div>
          <p class="length">{{ sun.dayLength }} of daylight in {{ sun.city }}</p>
          <p class="detail">{{ sun.change }}</p>
          @if (sun.next) {
            <p class="detail">{{ sun.next }}</p>
          }
        </div>
      } @else {
        <div class="widget-empty">
          <p class="polar">{{ sun.kind === 'polar-day' ? 'Polar day' : 'Polar night' }} in {{ sun.city }}</p>
          <p>{{ sun.kind === 'polar-day' ? "The sun doesn't set today." : "The sun doesn't rise today." }}</p>
        </div>
      }
    }
  `,
  styleUrl: './sun-widget.css',
})
export class SunWidget {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);
  protected readonly arc = ARC;

  /** Where the sun is on its arc, while it is up. */
  protected readonly position = computed(() => {
    const sun = this.webos.sun();
    if (sun?.status !== 'ready' || sun.kind !== 'day' || sun.progress < 0 || sun.progress > 1) return undefined;
    return { progress: sun.progress, ...this.pointAt(sun.progress) };
  });

  /** The arc from sunrise to `progress` of the way to sunset. */
  protected arcPath(progress: number): string {
    const end = this.pointAt(progress);
    const radius = (ARC.right - ARC.left) / 2;
    return `M ${ARC.left} ${ARC.horizon} A ${radius} ${ARC.height} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  private pointAt(progress: number) {
    const radius = (ARC.right - ARC.left) / 2;
    const angle = Math.PI * (1 - progress);
    return { x: ARC.left + radius + radius * Math.cos(angle), y: ARC.horizon - ARC.height * Math.sin(angle) };
  }
}
