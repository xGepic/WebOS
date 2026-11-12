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
        <div class="empty">
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
        <div class="empty">
          <p class="polar">{{ sun.kind === 'polar-day' ? 'Polar day' : 'Polar night' }} in {{ sun.city }}</p>
          <p>{{ sun.kind === 'polar-day' ? "The sun doesn't set today." : "The sun doesn't rise today." }}</p>
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
    .body {
      display: flex;
      flex: 1;
      flex-direction: column;
      justify-content: center;
      min-height: 0;
      padding: 0 0.5rem;
    }
    p {
      margin: 0;
    }
    .arc {
      width: 100%;
      max-height: 45cqh;
      overflow: visible;
    }
    .horizon {
      stroke: var(--material-border);
      stroke-width: 1;
    }
    .path {
      fill: none;
      stroke: var(--text-secondary);
      stroke-dasharray: 2 4;
      stroke-width: 1.25;
      opacity: 0.6;
    }
    .travelled {
      fill: none;
      stroke: var(--accent);
      stroke-width: 1.75;
      stroke-linecap: round;
    }
    .sun {
      fill: #f5d99a;
      filter: drop-shadow(0 0 6px rgba(245, 217, 154, 0.6));
    }
    .times {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      font-variant-numeric: tabular-nums;
    }
    .label {
      display: block;
      color: var(--text-secondary);
      font-size: 0.6875rem;
    }
    .end {
      text-align: right;
    }
    .length {
      margin-top: 0.375rem;
      font-size: 0.8125rem;
    }
    .detail {
      color: var(--text-secondary);
      font-size: 0.75rem;
    }
    @container (max-height: 11rem) {
      .length,
      .detail {
        display: none;
      }
    }
    .empty {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 0.5rem;
      padding: 0 0.5rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    .polar {
      color: var(--text-primary);
      font-weight: 500;
    }
  `,
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
