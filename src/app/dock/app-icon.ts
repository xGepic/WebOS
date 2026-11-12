import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { AppId } from '../../core';

/** Each App icon's background gradient, top to bottom. */
const backgrounds: Record<AppId, { top: string; bottom: string }> = {
  notes: { top: '#f7cf78', bottom: '#e3842f' },
  'dev-utilities': { top: '#73e6d6', bottom: '#127f88' },
  settings: { top: '#aaa5c8', bottom: '#47425f' },
};

/** An App's icon. Original artwork: a rounded gradient square with a simple white glyph. */
@Component({
  selector: 'webos-app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient [attr.id]="'icon-bg-' + app()" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" [attr.stop-color]="colours().top" />
          <stop offset="1" [attr.stop-color]="colours().bottom" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" [attr.fill]="'url(#icon-bg-' + app() + ')'" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="14.5" fill="none" stroke="white" stroke-opacity="0.22" />
      @switch (app()) {
        @case ('notes') {
          <!-- A sheet with a folded corner and ruled lines -->
          <path d="M19 14h19l9 9v27a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3z" fill="white" fill-opacity="0.95" />
          <path d="M38 14v6a3 3 0 0 0 3 3h6z" fill="#f2b25c" />
          <path d="M22 30h20M22 37h20M22 44h13" stroke="#e3842f" stroke-width="3" stroke-linecap="round" />
        }
        @case ('dev-utilities') {
          <!-- Angle brackets around a slash -->
          <path
            d="M24 21l-11 11 11 11M40 21l11 11-11 11M35 18l-6 28"
            fill="none"
            stroke="white"
            stroke-width="4.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        }
        @case ('settings') {
          <!-- Three sliders at different positions -->
          <path d="M15 21h34M15 32h34M15 43h34" stroke="white" stroke-opacity="0.55" stroke-width="3.5" stroke-linecap="round" />
          <circle cx="40" cy="21" r="5.5" fill="white" />
          <circle cx="24" cy="32" r="5.5" fill="white" />
          <circle cx="34" cy="43" r="5.5" fill="white" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class AppIcon {
  readonly app = input.required<AppId>();
  protected readonly colours = computed(() => backgrounds[this.app()]);
}
