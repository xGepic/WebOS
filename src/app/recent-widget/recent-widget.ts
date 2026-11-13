import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LinkIcon } from '../links-widget/link-icon';
import { WebOSCore } from '../webos-core';

/**
 * The Recent Widget: the pages visited last, latest first, from the browser's
 * history. It asks for them when it appears and whenever the tab is shown
 * again. Pages are plain anchors, so they open like any browser link.
 */
@Component({
  selector: 'webos-recent-widget',
  imports: [LinkIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material', '(document:visibilitychange)': 'refreshWhenShown()' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('recent') }}</h2>
    @if (webos.recentPages(); as pages) {
      @if (pages.length) {
        <ul>
          @for (page of pages; track page.url) {
            <li>
              <a class="page" [href]="page.url" [title]="page.url">
                <webos-link-icon class="icon" [link]="page" />
                <span class="text">
                  <span class="title">{{ page.title }}</span>
                  <span class="detail">{{ page.site }} · {{ page.when }}</span>
                </span>
              </a>
            </li>
          }
        </ul>
      } @else {
        <p class="empty">The pages you visit will show up here.</p>
      }
    }
  `,
  styleUrl: './recent-widget.css',
})
export class RecentWidget {
  protected readonly webos = inject(WebOSCore);

  constructor() {
    this.refresh();
  }

  /** A tab kept open shows the pages visited since, once it is shown again. */
  protected refreshWhenShown(): void {
    if (document.visibilityState === 'visible') this.refresh();
  }

  private refresh(): void {
    this.webos.send((core) => core.recent.refresh());
  }
}
