import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { CPU_HISTORY } from '../../core';
import { WebOSCore } from '../webos-core';

/** How often the Widget takes a reading while the tab is shown. */
const SAMPLE_EVERY_MS = 2000;

/**
 * The System Widget: how busy the processors are, with a sparkline of the
 * last minute, and how much memory is in use. It takes a reading every two
 * seconds, only while it is on the Desktop and the tab is shown.
 */
@Component({
  selector: 'webos-system-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material', '(document:visibilitychange)': 'sampleWhileShown()' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('system') }}</h2>
    @if (webos.system(); as system) {
      @if (system.status === 'ready') {
        <div class="body">
          <div class="meter cpu">
            <p class="label">CPU <span class="cores">{{ system.cores }} cores</span></p>
            <p class="value">{{ system.cpu }}<span class="unit">%</span></p>
            <svg class="sparkline" [attr.viewBox]="'0 0 ' + width + ' 24'" preserveAspectRatio="none" aria-hidden="true">
              <polyline [attr.points]="sparkline()" />
            </svg>
          </div>
          <div class="meter memory">
            <p class="label">Memory</p>
            <p class="value">{{ percent(system.memory) }}<span class="unit">%</span></p>
            <div class="bar" aria-hidden="true"><div class="fill" [style.width.%]="percent(system.memory)"></div></div>
            <p class="detail">{{ system.memoryUsed }} of {{ system.memoryTotal }}</p>
          </div>
        </div>
      } @else if (system.status === 'loading') {
        <p class="message">Measuring…</p>
      } @else {
        <p class="message">CPU and memory use can't be read here.</p>
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
      display: grid;
      flex: 1;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      align-content: center;
      padding: 0 0.5rem;
    }
    p {
      margin: 0;
    }
    .label {
      color: var(--text-secondary);
      font-size: 0.75rem;
      font-weight: 500;
    }
    .cores {
      margin-left: 0.25rem;
      opacity: 0.8;
      font-weight: 400;
    }
    .value {
      font-size: clamp(1.5rem, 20cqh, 2.25rem);
      font-weight: 200;
      letter-spacing: var(--tracking-display);
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .unit {
      margin-left: 0.1em;
      color: var(--text-secondary);
      font-size: 0.5em;
      letter-spacing: 0;
    }
    .sparkline {
      width: 100%;
      height: 1.5rem;
      margin-top: 0.25rem;
    }
    polyline {
      fill: none;
      stroke: var(--accent);
      stroke-width: 1.5;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }
    .bar {
      height: 0.375rem;
      margin-top: 0.75rem;
      border-radius: var(--radius-pill);
      background: var(--control-fill-hover);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      border-radius: inherit;
      background: var(--accent);
      transition: width 0.4s ease;
    }
    .detail {
      margin-top: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.6875rem;
      font-variant-numeric: tabular-nums;
    }
    .message {
      margin: auto 0;
      padding: 0 0.5rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    @media (prefers-reduced-motion: reduce) {
      .fill {
        transition: none;
      }
    }
  `,
})
export class SystemWidget {
  protected readonly webos = inject(WebOSCore);
  /** The sparkline's width in its own units: one unit per reading. */
  protected readonly width = CPU_HISTORY - 1;
  private timer: ReturnType<typeof setInterval> | undefined;

  /** The last readings as a line, newest on the right, filled from the right while there are few. */
  protected readonly sparkline = computed(() => {
    const system = this.webos.system();
    if (system?.status !== 'ready') return '';
    const offset = CPU_HISTORY - system.cpuHistory.length;
    return system.cpuHistory.map((busy, i) => `${offset + i},${(22 - busy * 20).toFixed(1)}`).join(' ');
  });

  constructor() {
    this.sampleWhileShown();
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Takes readings while the tab is shown, and stops while it is hidden. */
  protected sampleWhileShown(): void {
    if (document.visibilityState !== 'visible') {
      this.stop();
      return;
    }
    if (this.timer !== undefined) return;
    this.sample();
    this.timer = setInterval(() => this.sample(), SAMPLE_EVERY_MS);
  }

  protected percent(share: number): number {
    return Math.round(share * 100);
  }

  private sample(): void {
    this.webos.send((core) => core.system.sample());
  }

  private stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
