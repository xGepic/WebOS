import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { WidgetSize } from '../../core';
import { WebOSCore } from '../webos-core';

/** The disc's centre and radius, in the SVG's own units. */
const C = 50;
const R = 44;

/**
 * The Moon Widget: tonight's phase drawn as a lit disc, its name, how much is
 * lit, and when the next full and new moons are. Computed locally; seen from
 * the Weather city's hemisphere.
 */
@Component({
  selector: 'webos-moon-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material', '[class.stacked]': "size() !== 'S'" },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('moon') }}</h2>
    @if (webos.moon(); as moon) {
      <div class="body">
        <svg class="disc" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="dark" [attr.cx]="c" [attr.cy]="c" [attr.r]="r" />
          <path class="lit" [attr.d]="litPath()" [attr.transform]="moon.southern ? 'translate(100 0) scale(-1 1)' : null" />
        </svg>
        <div class="text">
          <p class="name">{{ moon.name }}</p>
          <p class="lit-share">{{ percent(moon.illumination) }}% lit</p>
          <dl>
            <div>
              <dt>Full</dt>
              <dd>{{ moon.nextFull.label }} <span class="relative">· {{ moon.nextFull.relative }}</span></dd>
            </div>
            <div>
              <dt>New</dt>
              <dd>{{ moon.nextNew.label }} <span class="relative">· {{ moon.nextNew.relative }}</span></dd>
            </div>
          </dl>
        </div>
      </div>
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
      align-items: center;
      gap: 1rem;
      min-height: 0;
      padding: 0 0.5rem;
    }
    /* Medium and large: the disc above the words. */
    :host(.stacked) .body {
      flex-direction: column;
      justify-content: center;
      gap: 0.75rem;
      text-align: center;
    }
    :host(.stacked) dl div {
      justify-content: center;
    }
    .disc {
      flex: none;
      width: min(40cqh, 9rem);
      height: min(40cqh, 9rem);
      min-width: 3rem;
      min-height: 3rem;
      filter: drop-shadow(0 0 14px rgba(200, 215, 255, 0.12));
    }
    .dark {
      fill: rgba(150, 175, 250, 0.08);
    }
    .lit {
      fill: var(--text-primary);
    }
    .text {
      min-width: 0;
    }
    p,
    dl,
    dd {
      margin: 0;
    }
    .name {
      font-size: 1rem;
      font-weight: 500;
    }
    .lit-share {
      color: var(--text-secondary);
      font-size: 0.8125rem;
    }
    dl {
      margin-top: 0.375rem;
      font-size: 0.75rem;
    }
    dl div {
      display: flex;
      gap: 0.4rem;
    }
    dt {
      min-width: 2rem;
      color: var(--text-secondary);
    }
    .relative {
      color: var(--text-secondary);
    }
  `,
})
export class MoonWidget {
  protected readonly webos = inject(WebOSCore);
  readonly size = input.required<WidgetSize>();
  protected readonly c = C;
  protected readonly r = R;

  /**
   * The lit part of the disc: the bright limb as a half circle, closed by the
   * terminator, a half ellipse whose width follows the phase. It bulges toward
   * the limb for a crescent and away from it past a quarter. Seen from the
   * north, the right side is lit while waxing.
   */
  protected readonly litPath = computed(() => {
    const moon = this.webos.moon();
    if (!moon) return '';
    const age = moon.age;
    const waxing = age < 0.5;
    const terminatorWidth = R * Math.abs(Math.cos(2 * Math.PI * age));
    // From the top down the limb: through the right side while waxing, the left while waning.
    const limbSweep = waxing ? 1 : 0;
    // Back up the terminator: through the left (sweep 1) for a waxing gibbous or a waning crescent.
    const quarter = Math.floor(age * 4) % 4;
    const terminatorSweep = quarter === 1 || quarter === 3 ? 1 : 0;
    const top = `${C} ${C - R}`;
    const bottom = `${C} ${C + R}`;
    return `M ${top} A ${R} ${R} 0 0 ${limbSweep} ${bottom} A ${terminatorWidth.toFixed(2)} ${R} 0 0 ${terminatorSweep} ${top} Z`;
  });

  protected percent(share: number): number {
    return Math.round(share * 100);
  }
}
