import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { AppId } from '../../core';

/**
 * An App's icon. Original artwork: a rounded gradient square with a simple glyph.
 * All Apps share the --icon-* colours and differ by their glyph.
 */
@Component({
  selector: 'webos-app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient [attr.id]="'icon-bg-' + app()" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" class="top" />
          <stop offset="1" class="bottom" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" [attr.fill]="'url(#icon-bg-' + app() + ')'" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="14.5" fill="none" class="edge" />
      @switch (app()) {
        @case ('notes') {
          <!-- A sheet with a folded corner and ruled lines -->
          <path d="M19 14h19l9 9v27a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3z" class="glyph-fill" fill-opacity="0.95" />
          <path d="M38 14v6a3 3 0 0 0 3 3h6z" class="notes-fold" />
          <path d="M22 30h20M22 37h20M22 44h13" class="notes-lines" stroke-width="3" stroke-linecap="round" />
        }
        @case ('countdowns') {
          <!-- An hourglass with sand settled in its lower bulb -->
          <path d="M20 14h24M20 50h24" class="glyph-stroke" stroke-width="4" stroke-linecap="round" />
          <path
            d="M24 14c0 10 8 12 8 18s-8 8-8 18M40 14c0 10-8 12-8 18s8 8 8 18"
            fill="none"
            class="glyph-stroke"
            stroke-opacity="0.55"
            stroke-width="3.5"
            stroke-linecap="round"
          />
          <path d="M26.5 47c1.5-6 4-8 5.5-8s4 2 5.5 8z" class="glyph-fill" />
          <path d="M28 21h8l-4 5z" class="glyph-fill" fill-opacity="0.8" />
        }
        @case ('world-clock') {
          <!-- A globe: its outline, two lines of latitude and a meridian -->
          <circle cx="32" cy="32" r="17" fill="none" class="glyph-stroke" stroke-width="4" />
          <path
            d="M16 26h32M16 38h32M32 15c-6 5-8 11-8 17s2 12 8 17c6-5 8-11 8-17s-2-12-8-17z"
            fill="none"
            class="glyph-stroke"
            stroke-opacity="0.55"
            stroke-width="3"
            stroke-linejoin="round"
          />
        }
        @case ('dev-utilities') {
          <!-- Angle brackets around a slash -->
          <path
            d="M24 21l-11 11 11 11M40 21l11 11-11 11M35 18l-6 28"
            fill="none"
            class="glyph-stroke"
            stroke-width="4.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        }
        @case ('settings') {
          <!-- Three sliders at different positions -->
          <path d="M15 21h34M15 32h34M15 43h34" class="glyph-stroke" stroke-opacity="0.55" stroke-width="3.5" stroke-linecap="round" />
          <circle cx="40" cy="21" r="5.5" class="glyph-fill" />
          <circle cx="24" cy="32" r="5.5" class="glyph-fill" />
          <circle cx="34" cy="43" r="5.5" class="glyph-fill" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    .top {
      stop-color: var(--icon-top);
    }
    .bottom {
      stop-color: var(--icon-bottom);
    }
    .edge {
      stroke: var(--icon-edge);
    }
    .glyph-fill {
      fill: var(--icon-glyph);
    }
    .glyph-stroke {
      stroke: var(--icon-glyph);
    }
    .notes-fold {
      fill: var(--icon-glyph-muted);
    }
    .notes-lines {
      stroke: var(--icon-glyph-muted);
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
}
