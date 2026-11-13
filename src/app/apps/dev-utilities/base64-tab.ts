import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { WebOSCore } from '../../webos-core';
import { DevUtilitiesHandoff } from './dev-utilities-handoff';
import { Output } from './output';

/** What the Base64 tab's input and output are called, by direction. */
const WORDING = {
  encode: { input: 'Text', placeholder: 'Text to encode', output: 'Base64' },
  decode: { input: 'Base64', placeholder: 'Base64 to decode', output: 'Text' },
} as const;

/** Dev Utilities › Base64: encodes text as UTF-8 Base64, optionally URL-safe, and decodes either kind. */
@Component({
  selector: 'webos-base64-tab',
  imports: [Output],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tab.css',
  template: `
    <div class="controls">
      <div class="segmented" role="group" aria-label="Direction">
        <button type="button" class="button" [attr.aria-pressed]="direction() === 'encode'" (click)="direction.set('encode')">Encode</button>
        <button type="button" class="button" [attr.aria-pressed]="direction() === 'decode'" (click)="direction.set('decode')">Decode</button>
      </div>
      @if (direction() === 'encode') {
        <label class="option">
          <input type="checkbox" class="checkbox" [checked]="urlSafe()" (change)="urlSafe.set(!urlSafe())" />
          URL-safe
        </label>
      } @else {
        <span class="hint">Standard or URL-safe, padded or not.</span>
      }
    </div>

    <div>
      <div class="labelled">
        <label class="label" for="base64-input">{{ wording().input }}</label>
      </div>
      <textarea
        #input
        id="base64-input"
        class="text-field code"
        spellcheck="false"
        [placeholder]="wording().placeholder"
        [value]="handedOver ?? ''"
        (input)="text.set(input.value)"
      ></textarea>
    </div>

    @if (result(); as result) {
      @if (result.ok) {
        <webos-output [label]="wording().output" [text]="result.output" />
      } @else {
        <p class="error" role="status">{{ result.error }}</p>
      }
    }
  `,
  styles: `
    .option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }
  `,
})
export class Base64Tab {
  private readonly webos = inject(WebOSCore);
  /** Base64 another App opened this tab with, such as a Clip, to decode. */
  protected readonly handedOver = inject(DevUtilitiesHandoff).take('base64');
  protected readonly text = signal(this.handedOver ?? '');
  protected readonly direction = signal<'encode' | 'decode'>(this.handedOver === undefined ? 'encode' : 'decode');
  protected readonly urlSafe = signal(false);
  protected readonly wording = computed(() => WORDING[this.direction()]);

  /** Nothing until something is typed. Encoding can't fail; decoding can. */
  protected readonly result = computed(() => {
    const tools = this.webos.devUtilities();
    const text = this.text();
    if (!tools || !text) return undefined;
    return this.direction() === 'encode'
      ? { ok: true as const, output: tools.encodeBase64(text, { urlSafe: this.urlSafe() }) }
      : tools.decodeBase64(text);
  });
}
