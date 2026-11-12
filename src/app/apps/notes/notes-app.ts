import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { ListedNote } from '../../../core';
import { WebOSCore } from '../../webos-core';
import { MarkdownPreview } from './markdown-preview';
import { PinIcon } from './pin-icon';

/** How long typing pauses before the Note is saved. */
const AUTOSAVE_DELAY_MS = 400;

/** An edit typed into the editor but not yet sent to the core. */
interface PendingEdit {
  noteId: string;
  body: string;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * The Notes App: a sidebar of Notes, most recently edited first; a Markdown
 * editor that saves as you type; and a live, sanitised preview beside it.
 * The Pin control chooses the Note the Notes Widget previews.
 */
@Component({
  selector: 'webos-notes-app',
  imports: [MarkdownPreview, PinIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:pagehide)': 'saveNow()', '(document:visibilitychange)': 'saveNow()' },
  template: `
    <nav class="sidebar" aria-label="Notes">
      <button type="button" class="button new" (click)="create()">New Note</button>
      <ul>
        @for (note of notes(); track note.id) {
          <li>
            <button
              type="button"
              class="note"
              [attr.aria-current]="note.id === selected()?.id ? 'true' : null"
              (click)="select(note)"
            >
              <span class="title">{{ note.title }}</span>
              <span class="edited">
                @if (note.pinned) {
                  <webos-pin-icon /><span class="visually-hidden">Pinned, </span>
                }
                {{ note.edited }}
              </span>
            </button>
          </li>
        }
      </ul>
    </nav>

    @if (selected(); as note) {
      @if (confirmingDelete()) {
        <div class="toolbar confirm" role="alert">
          <span>Delete “{{ note.title }}”?</span>
          <button type="button" class="button danger" (click)="remove(note)">Delete</button>
          <button type="button" class="button" (click)="confirmingDelete.set(false)">Cancel</button>
        </div>
      } @else {
        <div class="toolbar">
          <button
            type="button"
            class="button"
            title="Show this Note on the Notes Widget"
            [attr.aria-pressed]="note.pinned"
            (click)="togglePin(note)"
          >
            <webos-pin-icon />
            Pin
          </button>
          <button type="button" class="button danger" (click)="askToDelete(note)">Delete</button>
        </div>
      }
      <textarea
        #editor
        class="body"
        aria-label="Note"
        placeholder="Start writing. Markdown works: # heading, **bold**, - list, \`code\`"
        (input)="typed($event)"
        (blur)="saveNow()"
      ></textarea>
      <webos-markdown-preview class="preview" role="region" aria-label="Preview" [markdown]="draft()" />
    } @else {
      <div class="none">
        <p>Write ideas, snippets and meeting notes in Markdown.</p>
        <button type="button" class="button" (click)="create()">New Note</button>
      </div>
    }
  `,
  styles: `
    /* Sidebar on the left; a toolbar across the editor and preview, which sit side by side below it. */
    :host {
      display: grid;
      grid-template-columns: 14rem minmax(0, 1fr) minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr);
      height: 100%;
    }
    .sidebar {
      grid-row: 1 / -1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-height: 0;
      padding: 0.875rem 0.625rem;
      border-right: 1px solid var(--material-border);
    }
    .new {
      align-self: stretch;
    }
    ul {
      flex: 1;
      min-height: 0;
      margin: 0;
      padding: 0;
      overflow: auto;
      list-style: none;
      scrollbar-width: thin;
    }
    .note {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      width: 100%;
      padding: 0.5rem 0.625rem;
      border: 0;
      border-radius: var(--radius-control);
      background: none;
      color: var(--text-primary);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .note:hover {
      background: var(--control-fill);
    }
    .note[aria-current='true'] {
      background: var(--selected-fill);
    }
    .note:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: -2px;
    }
    .title {
      overflow: hidden;
      font-size: 0.875rem;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .edited {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      color: var(--text-secondary);
      font-size: 0.75rem;
    }
    .toolbar {
      grid-column: 2 / -1;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--material-border);
      font-size: 0.8125rem;
    }
    .confirm span {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .body {
      min-height: 0;
      padding: 1rem 1.25rem;
      border: 0;
      border-right: 1px solid var(--material-border);
      background: none;
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 0.875rem;
      line-height: 1.65;
      resize: none;
      outline: none;
      scrollbar-width: thin;
    }
    .body::placeholder {
      color: var(--text-secondary);
      opacity: 0.6;
    }
    .preview {
      min-height: 0;
      padding: 1rem 1.5rem;
      overflow: auto;
      scrollbar-width: thin;
    }
    .preview:empty::before {
      content: 'The preview appears here as you write.';
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    .none {
      grid-column: 2 / -1;
      grid-row: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    .none p {
      margin: 0;
    }
  `,
})
export class NotesApp {
  private readonly webos = inject(WebOSCore);
  private readonly injector = inject(Injector);
  private readonly editor = viewChild<ElementRef<HTMLTextAreaElement>>('editor');

  protected readonly notes = computed(() => this.webos.notes() ?? []);
  protected readonly selected = this.webos.selectedNote;
  /** Changes only when another Note is selected, not when the selected one is saved. */
  private readonly selectedId = computed(() => this.selected()?.id);
  /** Changes only when the selected Note's saved text does. */
  private readonly savedBody = computed(() => this.selected()?.body ?? '');
  /** The editor's text as typed, ahead of what has been saved. The preview renders it. */
  protected readonly draft = signal('');
  protected readonly confirmingDelete = signal(false);
  private pendingEdit: PendingEdit | undefined;
  /** The Note whose text is in the editor. */
  private loadedNoteId: string | undefined;

  constructor() {
    // Put the selected Note's saved text in the editor: when another Note is
    // selected, and when its text was changed elsewhere, such as in another tab.
    // While typed text is waiting to be saved it stays, since it is newer. The
    // editor is filled by hand rather than bound, so that a save landing
    // mid-typing can never replace text typed since.
    effect(() => {
      const noteId = this.selectedId();
      const body = this.savedBody();
      const editor = this.editor()?.nativeElement;
      untracked(() => {
        const switched = noteId !== this.loadedNoteId;
        if (!switched && this.pendingEdit) return;
        if (switched) this.confirmingDelete.set(false);
        this.loadedNoteId = noteId;
        this.draft.set(body);
        if (editor && editor.value !== body) editor.value = body;
      });
    });
    inject(DestroyRef).onDestroy(() => this.saveNow());
  }

  protected typed(event: Event): void {
    const noteId = this.selectedId();
    if (!noteId) return;
    const body = (event.target as HTMLTextAreaElement).value;
    this.draft.set(body);
    this.discardPendingEdit();
    this.pendingEdit = { noteId, body, timer: setTimeout(() => this.saveNow(), AUTOSAVE_DELAY_MS) };
  }

  /**
   * Saves the typed text now instead of after the pause: on blur, switching
   * Notes, closing, or leaving or hiding the page. If another tab deleted the
   * Note meanwhile, the text is kept as a new Note rather than lost.
   */
  protected saveNow(): void {
    const edit = this.pendingEdit;
    if (!edit) return;
    this.discardPendingEdit();
    this.webos.send<unknown>((core) =>
      core.notes.list().some((note) => note.id === edit.noteId)
        ? core.notes.edit(edit.noteId, edit.body)
        : core.notes.create(edit.body),
    );
  }

  private discardPendingEdit(): void {
    if (this.pendingEdit) clearTimeout(this.pendingEdit.timer);
    this.pendingEdit = undefined;
  }

  protected select(note: ListedNote): void {
    this.saveNow();
    this.webos.send((core) => core.notes.select(note.id));
  }

  protected create(): void {
    this.saveNow();
    this.webos.send((core) => core.notes.create());
    afterNextRender(() => this.editor()?.nativeElement.focus(), { injector: this.injector });
  }

  /** Pins the Note to the Notes Widget, or unpins it if it already is the Pinned Note. */
  protected togglePin(note: ListedNote): void {
    this.webos.send((core) => (note.pinned ? core.notes.unpin() : core.notes.pin(note.id)));
  }

  /** Asks before deleting a Note with text in it. An empty Note goes straight away. */
  protected askToDelete(note: ListedNote): void {
    if (this.draft().trim()) this.confirmingDelete.set(true);
    else this.remove(note);
  }

  protected remove(note: ListedNote): void {
    if (this.pendingEdit?.noteId === note.id) this.discardPendingEdit();
    this.confirmingDelete.set(false);
    this.webos.send((core) => core.notes.delete(note.id));
  }
}
