import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A pushpin, marking the Pinned Note. Decorative: whatever shows it also says "Pinned" in words or a label. */
@Component({
  selector: 'webos-pin-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 16 16" width="100%" height="100%">
      <path
        d="M10.2 1.6 14.4 5.8 13.3 6.3 10.9 8.7 11.2 11.9 10.1 13 7.1 10 3.5 13.6 2.4 12.5 6 8.9 3 5.9 4.1 4.8 7.3 5.1 9.7 2.7Z"
        fill="currentColor"
      />
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      flex: none;
      width: 0.875em;
      height: 0.875em;
    }
    svg {
      display: block;
    }
  `,
})
export class PinIcon {}
