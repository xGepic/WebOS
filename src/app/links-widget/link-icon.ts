import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Link } from '../../core';
import { faviconUrl } from '../../edges/favicon';

/**
 * A Link's icon: the site's favicon from the browser, or the first letter of
 * its title when there is none. Fills its host; the parent sets the size.
 */
@Component({
  selector: 'webos-link-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @if (src(); as src) {
      <img [src]="src" alt="" />
    } @else {
      <span class="monogram">{{ link().title.charAt(0) }}</span>
    }
  `,
  styles: `
    :host {
      display: grid;
      container-type: size;
    }
    img,
    .monogram {
      width: 100%;
      height: 100%;
    }
    .monogram {
      display: grid;
      place-items: center;
      border-radius: 25%;
      background: var(--control-fill-hover);
      color: var(--text-primary);
      font-size: 62cqh;
      font-weight: 700;
      line-height: 1;
      text-transform: uppercase;
    }
  `,
})
export class LinkIcon {
  readonly link = input.required<Pick<Link, 'title' | 'url'>>();
  /** The favicon size to ask the browser for, in px. */
  readonly resolution = input(32);
  protected readonly src = computed(() => faviconUrl(this.link().url, this.resolution()));
}
