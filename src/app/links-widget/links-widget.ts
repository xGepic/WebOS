import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';
import { LinkIcon } from './link-icon';

/**
 * The Links Widget: each Link Group as a section, each Link with its favicon
 * and title. Links are plain anchors, so they open like any browser link: a
 * click opens in this tab, ⌘/Ctrl+click or a middle-click in a background tab.
 */
@Component({
  selector: 'webos-links-widget',
  imports: [LinkIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('links') }}</h2>
    @for (group of webos.linkGroups(); track group.id) {
      <section [attr.aria-labelledby]="'link-group-' + group.id">
        <h3 [id]="'link-group-' + group.id">{{ group.name }}</h3>
        <ul>
          @for (link of group.links; track link.id) {
            <li>
              <a class="link" [href]="link.url" [title]="link.url">
                <webos-link-icon class="icon" [link]="link" />
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
  styleUrl: './links-widget.css',
})
export class LinksWidget {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);
}
