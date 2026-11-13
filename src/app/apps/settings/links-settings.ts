import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { Link, LinkGroup } from '../../../core';
import { WebOSCore } from '../../webos-core';

/**
 * Settings › Links and Dock: add, edit, reorder and delete Link Groups and
 * Links, and choose which Links are Docked and in what order.
 * Edits to a field are saved when it loses focus or Enter is pressed, so URLs
 * are normalised once, not on every keystroke.
 */
@Component({
  selector: 'webos-links-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="settings-links">
      <h3 id="settings-links" class="section-heading">Links</h3>
      <p class="hint">
        Docked Links sit in the Dock. A URL without http:// or https:// gets http:// for localhost and IP
        addresses, https:// otherwise.
      </p>

      @for (group of groups(); track group.id; let groupIndex = $index, firstGroup = $first, lastGroup = $last) {
        <div class="group" role="group" [attr.aria-label]="'Link Group ' + group.name">
          <div class="group-header">
            <input
              class="text-field group-name"
              aria-label="Link Group name"
              [value]="group.name"
              (change)="renameGroup(group, $event)"
            />
            <button type="button" class="button icon-only" aria-label="Move Link Group up" title="Move up"
              [disabled]="firstGroup" (click)="moveGroup(group, groupIndex - 1)">↑</button>
            <button type="button" class="button icon-only" aria-label="Move Link Group down" title="Move down"
              [disabled]="lastGroup" (click)="moveGroup(group, groupIndex + 1)">↓</button>
            <button type="button" class="button danger" (click)="confirmingDelete.set(group.id)">Delete</button>
          </div>

          @if (confirmingDelete() === group.id) {
            <div class="confirm" role="alert">
              <span>Delete “{{ group.name }}” and its {{ group.links.length }} {{ group.links.length === 1 ? 'Link' : 'Links' }}?</span>
              <button type="button" class="button danger" (click)="deleteGroup(group)">Delete</button>
              <button type="button" class="button" (click)="confirmingDelete.set(undefined)">Cancel</button>
            </div>
          }

          <ul>
            @for (link of group.links; track link.id; let linkIndex = $index, firstLink = $first, lastLink = $last) {
              <li class="link-row">
                <input class="text-field" aria-label="Title" [value]="link.title" (change)="editLink(link, 'title', $event)" />
                <input class="text-field url" aria-label="URL" spellcheck="false" [value]="link.url"
                  (change)="editLink(link, 'url', $event)" />
                <select class="text-field" aria-label="Link Group" (change)="moveToGroup(link, $event)">
                  @for (option of groups(); track option.id) {
                    <option [value]="option.id" [selected]="option.id === group.id">{{ option.name }}</option>
                  }
                </select>
                <button type="button" class="button" [attr.aria-pressed]="isDocked(link)"
                  [title]="isDocked(link) ? 'Docked: click to remove it from the Dock' : 'Add it to the Dock'"
                  (click)="toggleDocked(link)">Dock</button>
                <button type="button" class="button icon-only" aria-label="Move Link up" title="Move up"
                  [disabled]="firstLink" (click)="moveLink(link, group, linkIndex - 1)">↑</button>
                <button type="button" class="button icon-only" aria-label="Move Link down" title="Move down"
                  [disabled]="lastLink" (click)="moveLink(link, group, linkIndex + 1)">↓</button>
                <button type="button" class="button icon-only danger" aria-label="Delete Link" title="Delete"
                  (click)="deleteLink(link)">✕</button>
              </li>
            }
          </ul>

          <form class="add-link" (submit)="addLink(group, title, url, $event)">
            <input #title class="text-field" aria-label="New Link title" placeholder="Title" required />
            <input #url class="text-field url" aria-label="New Link URL" placeholder="localhost:4200" spellcheck="false" required />
            <button type="submit" class="button">Add Link</button>
          </form>
        </div>
      }

      <form class="add-group" (submit)="addGroup(groupName, $event)">
        <input #groupName class="text-field" aria-label="New Link Group name" placeholder="New Link Group, e.g. Local" required />
        <button type="submit" class="button">Add Link Group</button>
      </form>
    </section>

    <section class="dock-section" aria-labelledby="settings-dock">
      <h3 id="settings-dock" class="section-heading">Dock</h3>
      <p class="hint">Docked Links sit in the Dock after the Apps, in this order. Dock a Link with its Dock button above.</p>
      @if (docked().length) {
        <ol class="docked">
          @for (link of docked(); track link.id; let index = $index, first = $first, last = $last) {
            <li class="docked-row">
              <span class="docked-title">{{ link.title }}</span>
              <span class="docked-url">{{ link.url }}</span>
              <button type="button" class="button icon-only" [attr.aria-label]="'Move ' + link.title + ' earlier in the Dock'"
                title="Move up" [disabled]="first" (click)="moveDocked(link, index - 1)">↑</button>
              <button type="button" class="button icon-only" [attr.aria-label]="'Move ' + link.title + ' later in the Dock'"
                title="Move down" [disabled]="last" (click)="moveDocked(link, index + 1)">↓</button>
              <button type="button" class="button" (click)="undock(link)">Undock</button>
            </li>
          }
        </ol>
      } @else {
        <p class="hint empty-dock">No Docked Links yet.</p>
      }
    </section>
  `,
  styles: `
    .hint {
      margin-bottom: 1.25rem;
      max-width: 40rem;
    }
    .group {
      margin-bottom: 1.25rem;
      padding: 0.875rem;
      border: 1px solid var(--material-border);
      border-radius: var(--radius-inset);
    }
    .group-header,
    .link-row,
    .add-link,
    .add-group,
    .confirm {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .group-name {
      flex: 1;
      font-weight: 600;
    }
    .confirm {
      margin-top: 0.625rem;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-control);
      background: var(--control-fill);
      font-size: 0.8125rem;
    }
    .confirm span {
      flex: 1;
    }
    ul {
      margin: 0.75rem 0;
      padding: 0;
      list-style: none;
    }
    .link-row + .link-row {
      margin-top: 0.375rem;
    }
    .link-row .text-field,
    .add-link .text-field {
      flex: 2;
    }
    .link-row .url,
    .add-link .url {
      flex: 3;
    }
    .link-row select {
      flex: 1.5;
    }
    .add-group {
      max-width: 30rem;
    }
    .dock-section {
      margin-top: 2.25rem;
    }
    .docked {
      margin: 1rem 0 0;
      padding: 0;
      list-style: none;
      max-width: 40rem;
    }
    .docked-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0;
    }
    .docked-title {
      font-weight: 600;
      font-size: 0.875rem;
    }
    .docked-url {
      flex: 1;
      overflow: hidden;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .empty-dock {
      margin-top: 0.75rem;
    }
  `,
})
export class LinksSettings {
  private readonly webos = inject(WebOSCore);
  protected readonly groups = computed(() => this.webos.linkGroups() ?? []);
  protected readonly docked = computed(() => this.webos.dockedLinks() ?? []);
  private readonly dockedIds = computed(() => new Set(this.docked().map((link) => link.id)));
  /** The Link Group waiting for delete confirmation, if any. */
  protected readonly confirmingDelete = signal<string | undefined>(undefined);

  protected addGroup(nameField: HTMLInputElement, event: Event): void {
    event.preventDefault();
    const name = nameField.value.trim();
    if (!name) return;
    this.webos.send((core) => core.links.addGroup(name));
    nameField.value = '';
  }

  protected renameGroup(group: LinkGroup, event: Event): void {
    const input = event.target as HTMLInputElement;
    const name = input.value.trim();
    if (!name) {
      input.value = group.name;
      return;
    }
    this.webos.send((core) => core.links.renameGroup(group.id, name));
  }

  protected moveGroup(group: LinkGroup, toIndex: number): void {
    this.webos.send((core) => core.links.moveGroup(group.id, toIndex));
  }

  protected deleteGroup(group: LinkGroup): void {
    this.confirmingDelete.set(undefined);
    this.webos.send((core) => core.links.deleteGroup(group.id));
  }

  protected addLink(group: LinkGroup, titleField: HTMLInputElement, urlField: HTMLInputElement, event: Event): void {
    event.preventDefault();
    const title = titleField.value.trim();
    const url = urlField.value.trim();
    if (!title || !url) return;
    this.webos.send((core) => core.links.addLink(group.id, { title, url }));
    titleField.value = '';
    urlField.value = '';
    titleField.focus();
  }

  protected editLink(link: Link, field: 'title' | 'url', event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    if (!value) {
      input.value = link[field];
      return;
    }
    const { title, url } = link;
    this.webos.send((core) => core.links.editLink(link.id, { title, url, [field]: value }));
  }

  protected moveLink(link: Link, group: LinkGroup, toIndex: number): void {
    this.webos.send((core) => core.links.moveLink(link.id, group.id, toIndex));
  }

  /** Moves a Link to the end of the Link Group picked for it. */
  protected moveToGroup(link: Link, event: Event): void {
    const toGroupId = (event.target as HTMLSelectElement).value;
    this.webos.send((core) => core.links.moveLink(link.id, toGroupId, Infinity));
  }

  protected isDocked(link: Link): boolean {
    return this.dockedIds().has(link.id);
  }

  protected toggleDocked(link: Link): void {
    if (this.isDocked(link)) this.undock(link);
    else this.webos.send((core) => core.links.dock(link.id));
  }

  protected moveDocked(link: Link, toIndex: number): void {
    this.webos.send((core) => core.links.moveDocked(link.id, toIndex));
  }

  protected undock(link: Link): void {
    this.webos.send((core) => core.links.undock(link.id));
  }

  protected deleteLink(link: Link): void {
    this.webos.send((core) => core.links.deleteLink(link.id));
  }
}
