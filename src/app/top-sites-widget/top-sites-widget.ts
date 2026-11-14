import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteIcon } from '../recent-widget/site-icon';
import { WebOSCore } from '../webos-core';

/**
 * The Top Sites Widget: the sites visited most, as the browser's own new tab
 * page lists them, each a tile with its icon and name. As many rows as fit
 * show; the rest are left out. Like the Clock it has no surface, so under the
 * Search Widget it reads as part of it. It asks for the sites when it appears
 * and whenever the tab is shown again. Tiles are plain anchors, so they open
 * like any browser link.
 */
@Component({
  selector: 'webos-top-sites-widget',
  imports: [SiteIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:visibilitychange)': 'refreshWhenShown()' },
  template: `
    @if (webos.topSites(); as sites) {
      @if (sites.length) {
        <ul [attr.aria-label]="webos.widgetName('top-sites')">
          @for (site of sites; track site.url) {
            <li>
              <a class="site" [href]="site.url" [title]="site.title + '\\n' + site.site">
                <span class="tile"><webos-site-icon class="icon" [page]="site" /></span>
                <span class="name">{{ site.title }}</span>
              </a>
            </li>
          }
        </ul>
      } @else {
        <p class="empty">The sites you visit most will show up here.</p>
      }
    }
  `,
  styleUrl: './top-sites-widget.css',
})
export class TopSitesWidget {
  protected readonly webos = inject(WebOSCore);

  constructor() {
    this.refresh();
  }

  /** A tab kept open shows the browser's latest, once it is shown again. */
  protected refreshWhenShown(): void {
    if (document.visibilityState === 'visible') this.refresh();
  }

  private refresh(): void {
    this.webos.send((core) => core.topSites.refresh());
  }
}
