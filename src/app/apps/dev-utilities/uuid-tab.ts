import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { WebOSCore } from '../../webos-core';
import { Output } from './output';

/** Dev Utilities › UUID: one or many random (v4) UUIDs, one per line. */
@Component({
  selector: 'webos-uuid-tab',
  imports: [Output],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tab.css',
  template: `
    <form class="controls" (submit)="generate(count.valueAsNumber, $event)">
      <label class="label" for="uuid-count">How many</label>
      <input #count id="uuid-count" class="text-field count" type="number" min="1" max="100" value="1" />
      <button type="submit" class="button">Generate</button>
    </form>

    @if (generated().length) {
      <webos-output [label]="generated().length === 1 ? 'UUID' : generated().length + ' UUIDs'" [copyLabel]="generated().length === 1 ? 'UUID' : 'UUIDs'" [text]="lines()" />
    }
  `,
  styles: `
    .count {
      width: 5.5rem;
    }
  `,
})
export class UuidTab {
  private readonly webos = inject(WebOSCore);
  /** One is ready as soon as the tab opens. */
  protected readonly generated = signal<readonly string[]>(this.webos.devUtilities()?.uuids(1) ?? []);
  protected readonly lines = computed(() => this.generated().join('\n'));

  protected generate(count: number, event: Event): void {
    event.preventDefault();
    this.generated.set(this.webos.devUtilities()?.uuids(count) ?? []);
  }
}
