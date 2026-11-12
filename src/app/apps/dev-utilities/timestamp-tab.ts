import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { WebOSCore } from '../../webos-core';
import { CopyButton } from './copy-button';

/**
 * Dev Utilities › Timestamp: type a Unix timestamp (seconds or milliseconds,
 * told apart by size) or a date, and see it in every form.
 */
@Component({
  selector: 'webos-timestamp-tab',
  imports: [CopyButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tab.css',
  template: `
    <div>
      <div class="labelled">
        <label class="label" for="timestamp-input">Timestamp or date</label>
      </div>
      <div class="controls">
        <input
          #input
          id="timestamp-input"
          class="text-field code"
          spellcheck="false"
          autocomplete="off"
          placeholder="1700000000, 2026-11-12 09:30 or 2026-11-12T08:30:00Z"
          (input)="text.set(input.value)"
        />
        <button type="button" class="button" (click)="useNow(input)">Now</button>
      </div>
    </div>

    @if (result(); as result) {
      @if (result.ok) {
        @if (result.unit) {
          <p class="hint" role="status">Read as {{ result.unit }}.</p>
        }
        <dl class="rows">
          <dt>Seconds</dt>
          <dd class="code">{{ result.seconds }}</dd>
          <webos-copy-button [text]="result.seconds" label="seconds" />
          <dt>Milliseconds</dt>
          <dd class="code">{{ result.milliseconds }}</dd>
          <webos-copy-button [text]="result.milliseconds" label="milliseconds" />
          <dt>Local</dt>
          <dd>{{ result.local }}</dd>
          <webos-copy-button [text]="result.local" label="local time" />
          <dt>ISO</dt>
          <dd class="code">{{ result.iso }}</dd>
          <webos-copy-button [text]="result.iso" label="ISO date" />
        </dl>
      } @else {
        <p class="error" role="status">{{ result.error }}</p>
      }
    }
  `,
  styles: `
    .controls .text-field {
      flex: 1;
    }
  `,
})
export class TimestampTab {
  private readonly webos = inject(WebOSCore);
  protected readonly text = signal('');

  /** Nothing until something is typed. */
  protected readonly result = computed(() => {
    const tools = this.webos.devUtilities();
    const text = this.text();
    if (!tools || !text.trim()) return undefined;
    return tools.convertTime(text);
  });

  /** Fills in the current time, in seconds. */
  protected useNow(input: HTMLInputElement): void {
    const now = this.webos.devUtilities()?.now();
    if (!now?.ok) return;
    input.value = now.seconds;
    this.text.set(now.seconds);
  }
}
