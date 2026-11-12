import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { ListedNote } from '../../core';
import { MarkdownPreview } from '../apps/notes/markdown-preview';
import { PinIcon } from '../apps/notes/pin-icon';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/**
 * The Notes Widget: a preview of the Pinned Note, or of the most recently
 * edited Note when none is pinned. Clicking it opens that Note in the Notes App.
 * With no Notes yet, it offers to create one.
 */
@Component({
  selector: 'webos-notes-widget',
  imports: [MarkdownPreview, PinIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    @if (webos.widgetNote(); as note) {
      <!-- One control covers the Widget, so a click anywhere opens the Note. -->
      <button type="button" class="open" [attr.aria-label]="'Open “' + note.title + '” in Notes'" (click)="open(note)"></button>
      <p class="caption">
        @if (note.pinned) {
          <webos-pin-icon />
          Pinned
        } @else {
          Edited {{ note.edited }}
        }
      </p>
      <webos-markdown-preview class="preview" inert [markdown]="note.body" />
    } @else {
      <div class="empty">
        <p>Jot down ideas, snippets and meeting notes. Pin one to keep it here.</p>
        <button type="button" class="button" (click)="create()">New Note</button>
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      overflow: hidden;
      padding: 1rem 1.125rem;
      border-radius: var(--radius-widget);
    }
    .open {
      position: absolute;
      inset: 0;
      z-index: 1;
      padding: 0;
      border: 0;
      border-radius: inherit;
      background: none;
      cursor: pointer;
    }
    .open:hover {
      background: var(--control-fill);
    }
    .open:active {
      background: var(--control-fill-hover);
    }
    .open:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: -2px;
    }
    .caption {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.6875rem;
      font-weight: 650;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    /* Smaller than in the Notes App, and fading out where the Widget cuts it off. */
    .preview {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      font-size: 0.8125rem;
      -webkit-mask-image: linear-gradient(to bottom, black 75%, transparent);
      mask-image: linear-gradient(to bottom, black 75%, transparent);
    }
    .empty {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 0.75rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    .empty p {
      margin: 0;
    }
  `,
})
export class NotesWidget {
  protected readonly webos = inject(WebOSCore);
  private readonly window = inject(WindowState);

  protected open(note: ListedNote): void {
    this.webos.send((core) => core.notes.select(note.id));
    this.window.open('notes');
  }

  protected create(): void {
    this.webos.send((core) => core.notes.create());
    this.window.open('notes');
  }
}
