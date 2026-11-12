import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CopyButton } from './copy-button';

/** One labelled output of a Dev Utilities tab, with its copy button. */
@Component({
  selector: 'webos-output',
  imports: [CopyButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="labelled">
      <span class="label" [class.valid]="tone() === 'valid'">{{ label() }}</span>
      <webos-copy-button [text]="text()" [label]="copyLabel() ?? label()" />
    </div>
    <pre class="output">{{ text() }}</pre>
  `,
  styles: `
    :host {
      display: block;
    }
    .labelled {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      min-height: 1.75rem;
      margin-bottom: 0.375rem;
    }
    .label {
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .valid {
      color: var(--accent);
    }
    .output {
      margin: 0;
      max-height: 20rem;
      padding: 0.75rem 0.875rem;
      overflow: auto;
      border-radius: var(--radius-control);
      background: var(--control-fill);
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      line-height: 1.55;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      scrollbar-width: thin;
    }
  `,
})
export class Output {
  readonly label = input.required<string>();
  readonly text = input.required<string>();
  /** What the copy button names for screen readers, when not the label: "Copy payload". */
  readonly copyLabel = input<string>();
  /** "valid" shows the label as a success, e.g. "Valid JSON". */
  readonly tone = input<'valid'>();
}
