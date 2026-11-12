import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';

/** How long "Copied" or "Copy failed" shows after a copy. */
const CONFIRMATION_MS = 1500;

/** Copies `text` to the clipboard in one click, and says briefly whether it worked. */
@Component({
  selector: 'webos-copy-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="button"
      [class.danger]="outcome() === 'failed'"
      [disabled]="!text()"
      [attr.aria-label]="'Copy ' + label()"
      (click)="copy()"
    >
      {{ outcome() === 'copied' ? 'Copied' : outcome() === 'failed' ? 'Copy failed' : 'Copy' }}
    </button>
    <span class="visually-hidden" aria-live="polite">
      {{ outcome() === 'copied' ? label() + ' copied' : outcome() === 'failed' ? 'Could not copy ' + label() : '' }}
    </span>
  `,
  styles: `
    :host {
      flex: none;
    }
    .button {
      min-width: 4.25rem;
      padding: 0.3rem 0.65rem;
      font-size: 0.75rem;
    }
  `,
})
export class CopyButton {
  readonly text = input.required<string>();
  /** What is copied, for screen readers: "Copy payload". */
  readonly label = input.required<string>();
  protected readonly outcome = signal<'copied' | 'failed' | undefined>(undefined);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected copy(): void {
    navigator.clipboard.writeText(this.text()).then(
      () => this.show('copied'),
      (error) => {
        console.error('webOS could not copy to the clipboard', error);
        this.show('failed');
      },
    );
  }

  private show(outcome: 'copied' | 'failed'): void {
    this.outcome.set(outcome);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.outcome.set(undefined), CONFIRMATION_MS);
  }
}
