import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { RecentPage } from '../../core';
import { faviconUrl } from '../../edges/favicon';

/** The favicon size asked of the browser, in px. */
const FAVICON_SIZE = 32;

/**
 * A page's site icon: the site's favicon from the browser, or the first letter
 * of the page's title when there is none. Fills its host; the parent sets the size.
 */
@Component({
  selector: 'webos-site-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @if (src(); as src) {
      <img [src]="src" alt="" />
    } @else {
      <span class="monogram">{{ page().title.charAt(0) }}</span>
    }
  `,
  styleUrl: './site-icon.css',
})
export class SiteIcon {
  readonly page = input.required<Pick<RecentPage, 'title' | 'url'>>();
  protected readonly src = computed(() => faviconUrl(this.page().url, FAVICON_SIZE));
}
