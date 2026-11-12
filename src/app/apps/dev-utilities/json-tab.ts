import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { WebOSCore } from '../../webos-core';
import { Output } from './output';

/** Dev Utilities › JSON: checks JSON as you type, and shows it pretty-printed or minified. */
@Component({
  selector: 'webos-json-tab',
  imports: [Output],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tab.css',
  template: `
    <div>
      <div class="labelled">
        <label class="label" for="json-input">JSON</label>
        <div class="segmented" role="group" aria-label="Output">
          <button type="button" class="button" [attr.aria-pressed]="layout() === 'pretty'" (click)="layout.set('pretty')">Pretty</button>
          <button type="button" class="button" [attr.aria-pressed]="layout() === 'minified'" (click)="layout.set('minified')">Minified</button>
        </div>
      </div>
      <textarea
        #input
        id="json-input"
        class="text-field code"
        spellcheck="false"
        placeholder="Paste JSON to check it, pretty-print it or minify it"
        (input)="text.set(input.value)"
      ></textarea>
    </div>

    @if (result(); as result) {
      @if (result.ok) {
        <webos-output label="Valid JSON" tone="valid" copyLabel="JSON" [text]="result.output" />
      } @else {
        <p class="error" role="status">Line {{ result.error.line }}, column {{ result.error.column }}: {{ result.error.message }}</p>
      }
    }
  `,
})
export class JsonTab {
  private readonly webos = inject(WebOSCore);
  protected readonly text = signal('');
  protected readonly layout = signal<'pretty' | 'minified'>('pretty');

  /** Nothing until something is typed. */
  protected readonly result = computed(() => {
    const tools = this.webos.devUtilities();
    const text = this.text();
    if (!tools || !text.trim()) return undefined;
    return this.layout() === 'pretty' ? tools.formatJson(text) : tools.minifyJson(text);
  });
}
