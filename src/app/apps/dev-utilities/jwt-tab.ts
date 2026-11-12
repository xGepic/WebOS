import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { WebOSCore } from '../../webos-core';
import { CopyButton } from './copy-button';
import { Output } from './output';

/**
 * Dev Utilities › JWT: the decoded header and payload, the time claims in
 * local time, and whether the token is valid now. It only decodes: the
 * signature is not verified, and it says so.
 */
@Component({
  selector: 'webos-jwt-tab',
  imports: [CopyButton, Output],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tab.css',
  template: `
    <div>
      <div class="labelled">
        <label class="label" for="jwt-input">JWT</label>
      </div>
      <textarea
        #input
        id="jwt-input"
        class="text-field code"
        spellcheck="false"
        placeholder="Paste a token, with or without “Bearer”"
        (input)="text.set(input.value)"
      ></textarea>
      <p class="hint notice">Decoding only: the signature is not verified.</p>
    </div>

    @if (result(); as result) {
      @if (result.ok) {
        @switch (result.validity) {
          @case ('expired') {
            <p class="badge invalid" role="status">Expired</p>
          }
          @case ('not yet valid') {
            <p class="badge invalid" role="status">Not valid yet</p>
          }
          @case ('valid') {
            <p class="badge valid" role="status">Valid now</p>
          }
        }
        @if (result.times.length) {
          <dl class="rows">
            @for (time of result.times; track time.claim) {
              <dt>{{ time.label }} <code>{{ time.claim }}</code></dt>
              @if (time.ok) {
                <dd>{{ time.local }}</dd>
                <webos-copy-button [text]="time.local" [label]="time.label + ' in local time'" />
                <dd class="iso code">{{ time.iso }}</dd>
                <webos-copy-button [text]="time.iso" [label]="time.label + ' as an ISO date'" />
              } @else {
                <dd class="error">{{ time.error }}</dd>
              }
            }
          </dl>
        }
        <webos-output label="Header" copyLabel="header" [text]="result.header" />
        <webos-output label="Payload" copyLabel="payload" [text]="result.payload" />
      } @else {
        <p class="error" role="status">{{ result.error }}</p>
      }
    }
  `,
  styles: `
    textarea.code {
      min-height: 5.5rem;
    }
    .notice {
      margin-top: 0.5rem;
    }
    .badge {
      align-self: flex-start;
      margin: 0;
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-control);
      font-size: 0.75rem;
      font-weight: 650;
    }
    .badge.invalid {
      background: var(--control-fill);
      color: var(--danger);
    }
    .badge.valid {
      background: var(--selected-fill);
      color: var(--accent);
    }
    dt code {
      margin-left: 0.25rem;
      font-family: var(--font-mono);
      font-weight: 400;
      opacity: 0.8;
    }
    dd {
      font-size: 0.875rem;
    }
    /* The ISO date sits on its own row under the local time, in the value column. */
    .iso {
      grid-column: 2;
      color: var(--text-secondary);
      font-size: 0.75rem;
    }
    .error {
      grid-column: 2 / -1;
    }
  `,
})
export class JwtTab {
  private readonly webos = inject(WebOSCore);
  protected readonly text = signal('');

  /** Nothing until something is typed. Re-checked every minute, so "Expired" appears on time. */
  protected readonly result = computed(() => {
    this.webos.time();
    const tools = this.webos.devUtilities();
    const text = this.text();
    if (!tools || !text.trim()) return undefined;
    return tools.decodeJwt(text);
  });
}
