import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import type { ListedNote } from '../../core';
import { MarkdownPreview } from '../apps/notes/markdown-preview';
import { PinIcon } from '../apps/notes/pin-icon';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/**
 * The Notes Widget: a preview of the Pinned Note, or of the most recently
 * edited Note when none is pinned. Clicking it opens that Note in the Notes App,
 * which has no Dock icon: the Window springs out of this Widget instead.
 * With no Notes yet, it offers to create one.
 */
@Component({
  selector: 'webos-notes-widget',
  imports: [MarkdownPreview, PinIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('notes') }}</h2>
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
      <div class="widget-empty">
        <p>Jot down ideas, snippets and meeting notes. Pin one to keep it here.</p>
        <button type="button" class="button" (click)="create()">New Note</button>
      </div>
    }
  `,
  styleUrl: './notes-widget.css',
})
export class NotesWidget {
  protected readonly webos = inject(WebOSCore);
  private readonly window = inject(WindowState);

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    this.window.registerOrigin('notes', element);
    inject(DestroyRef).onDestroy(() => this.window.unregisterOrigin('notes', element));
  }

  protected open(note: ListedNote): void {
    this.webos.send((core) => core.notes.select(note.id));
    this.window.open('notes');
  }

  protected create(): void {
    this.webos.send((core) => core.notes.create());
    this.window.open('notes');
  }
}
