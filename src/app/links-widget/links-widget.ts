import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { faviconUrl } from '../../edges/favicon';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/**
 * The Links Widget: each Link Group as a section, each Link with its favicon
 * and title. Links are plain anchors, so they open like any browser link: a
 * click opens in this tab, ⌘/Ctrl+click or a middle-click in a background tab.
 */
@Component({
  selector: 'webos-links-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    @for (group of webos.linkGroups(); track group.id) {
      <section [attr.aria-labelledby]="'link-group-' + group.id">
        <h3 [id]="'link-group-' + group.id">{{ group.name }}</h3>
        <ul>
          @for (link of group.links; track link.id) {
            <li>
              <a class="link" [href]="link.url" [title]="link.url">
                @if (favicon(link.url); as src) {
                  <img [src]="src" width="16" height="16" alt="" />
                } @else {
                  <span class="monogram" aria-hidden="true">{{ link.title.charAt(0) }}</span>
                }
                <span class="title">{{ link.title }}</span>
              </a>
            </li>
          }
        </ul>
      </section>
    } @empty {
      <div class="empty">
        <p>Keep your dev servers, dashboards and docs one click away.</p>
        <button type="button" class="button" (click)="window.open('settings')">Add Links in Settings</button>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      overflow: auto;
      padding: 1rem 0.75rem;
      border-radius: var(--radius-widget);
      scrollbar-width: thin;
    }
    h3 {
      margin: 0 0 0.25rem;
      padding: 0 0.5rem;
      color: var(--text-secondary);
      font-size: 0.6875rem;
      font-weight: 650;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .link {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.375rem 0.5rem;
      border-radius: var(--radius-control);
      color: var(--text-primary);
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
    }
    .link:hover {
      background: var(--control-fill);
    }
    .link:active {
      background: var(--control-fill-hover);
    }
    .link:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: -2px;
    }
    img,
    .monogram {
      flex: none;
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }
    .monogram {
      display: grid;
      place-items: center;
      background: var(--control-fill-hover);
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .empty {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 0.75rem;
      padding: 0 0.5rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    .empty p {
      margin: 0;
    }
  `,
})
export class LinksWidget {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);
  protected readonly favicon = faviconUrl;
}
