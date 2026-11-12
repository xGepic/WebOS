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
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 1rem 0.75rem;
      border-radius: var(--radius-widget);
    }
    ul {
      margin: 0;
      padding: 0;
      overflow: auto;
      list-style: none;
      scrollbar-width: thin;
    }
    .page {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.3rem 0.5rem;
      border-radius: var(--radius-control);
      color: var(--text-primary);
      text-decoration: none;
    }
    .page:hover {
      background: var(--control-fill);
    }
    .page:active {
      background: var(--control-fill-hover);
    }
    .page:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: -2px;
    }
    .icon {
      flex: none;
      width: 16px;
      height: 16px;
    }
    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .title,
    .detail {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .title {
      font-size: 0.8125rem;
      font-weight: 500;
    }
    .detail {
      color: var(--text-secondary);
      font-size: 0.6875rem;
    }
    .empty {
      margin: auto 0;
      padding: 0 0.5rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
  `,
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
