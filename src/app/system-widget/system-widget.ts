import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { CPU_HISTORY } from '../../core';
import { WebOSCore } from '../webos-core';

/** How often the Widget takes a reading while the tab is shown. */
const SAMPLE_EVERY_MS = 2000;

/**
 * The System Widget: how busy the processors are, with a sparkline of the
 * last minute, and how much memory is in use; below them the processor's
 * name and the network. Settings › System chooses which of these it shows. It takes a reading every two seconds, only while it is on
 * the Desktop and the tab is shown.
 */
@Component({
  selector: 'webos-system-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material', '(document:visibilitychange)': 'sampleWhileShown()' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('system') }}</h2>
    @if (webos.system(); as system) {
      <div class="body">
        @if (system.shown.cpu || system.shown.memory) {
          @if (system.usage; as usage) {
            @if (usage.status === 'ready') {
              <div class="meters">
                @if (system.shown.cpu) {
                  <div class="meter cpu">
                    <p class="label">CPU <span class="cores">{{ usage.cores }} cores</span></p>
                    <p class="value">{{ usage.cpu }}<span class="unit">%</span></p>
                    <svg class="sparkline" [attr.viewBox]="'0 0 ' + width + ' 24'" preserveAspectRatio="none" aria-hidden="true">
                      <polyline [attr.points]="sparkline()" />
                    </svg>
                  </div>
                }
                @if (system.shown.memory) {
                  <div class="meter memory">
                    <p class="label">Memory</p>
                    <p class="value">{{ percent(usage.memory) }}<span class="unit">%</span></p>
                    <div class="bar" aria-hidden="true"><div class="fill" [style.width.%]="percent(usage.memory)"></div></div>
                    <p class="detail">{{ usage.memoryUsed }} of {{ usage.memoryTotal }}</p>
                  </div>
                }
              </div>
            } @else if (usage.status === 'loading') {
              <p class="message">Measuring…</p>
            } @else {
              <p class="message">CPU and memory use can't be read here.</p>
            }
          }
        }

        @if (details(); as details) {
          @if (details.any) {
            <dl class="details">
              @if (details.processor; as processor) {
                <div class="row">
                  <dt>Processor</dt>
                  <dd>{{ processor }}</dd>
                </div>
              }
              @if (details.network; as network) {
                <div class="row">
                  <dt>Network</dt>
                  <dd [class.offline]="!network.online">{{ network.summary }}</dd>
                </div>
              }
            </dl>
          }
        }

        @if (nothingShown()) {
          <p class="message">Everything is hidden. Choose what to show in Settings › System.</p>
        }
      </div>
    }
  `,
  styleUrl: './system-widget.css',
})
export class SystemWidget {
  protected readonly webos = inject(WebOSCore);
  /** The sparkline's width in its own units: one unit per reading. */
  protected readonly width = CPU_HISTORY - 1;
  private timer: ReturnType<typeof setInterval> | undefined;

  /** The last readings as a line, newest on the right, filled from the right while there are few. */
  protected readonly sparkline = computed(() => {
    const usage = this.webos.system()?.usage;
    if (usage?.status !== 'ready') return '';
    const offset = CPU_HISTORY - usage.cpuHistory.length;
    return usage.cpuHistory.map((busy, i) => `${offset + i},${(22 - busy * 20).toFixed(1)}`).join(' ');
  });

  /** The rows under the meters that are shown and known. */
  protected readonly details = computed(() => {
    const system = this.webos.system();
    if (!system) return undefined;
    const processor = system.shown.processor ? system.processor : undefined;
    const network = system.shown.network ? system.network : undefined;
    return { processor, network, any: !!processor || !!network };
  });

  /** Whether the user hid every part. */
  protected readonly nothingShown = computed(() => {
    const shown = this.webos.system()?.shown;
    return !!shown && Object.values(shown).every((on) => !on);
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
