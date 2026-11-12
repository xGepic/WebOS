import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
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
  viewChildren,
} from '@angular/core';
import type { Todo } from '../../core';
import { WebOSCore } from '../webos-core';
import { TodoHighlight } from './todo-highlight';

/** How long a Todo chosen in the Launcher stays highlighted. */
const HIGHLIGHT_MS = 2400;

/**
 * The Todos Widget: one flat list. Type and press Enter to add a Todo; check
 * it off, click its text to edit it, drag it (or Alt+↑/↓) to reorder it.
 * Completed Todos collapse into their own section and are cleared 3 days
 * after completion. A Todo chosen in the Launcher is scrolled into view,
 * focused and highlighted for a moment.
 */
@Component({
  selector: 'webos-todos-widget',
  imports: [CdkDropList, CdkDrag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('todos') }}</h2>
    <form class="quick-add" (submit)="add(newTodo, $event)">
      <input #newTodo class="text-field" placeholder="Add a Todo" aria-label="New Todo" autocomplete="off" maxlength="200" />
    </form>

    <ul class="open" cdkDropList cdkDropListLockAxis="y" aria-label="Open Todos" (cdkDropListDropped)="drop($event)">
      @for (todo of open(); track todo.id; let index = $index) {
        <li
          class="todo"
          cdkDrag
          cdkDragPreviewClass="material"
          [cdkDragData]="todo"
          [attr.data-todo]="todo.id"
          [class.highlighted]="highlightedId() === todo.id"
        >
          <input type="checkbox" class="checkbox" [attr.aria-label]="'Complete ' + todo.text" (change)="complete(todo)" />
          @if (editingId() === todo.id) {
            <input
              #editField
              class="text-field edit"
              aria-label="Edit Todo"
              maxlength="200"
              [value]="todo.text"
              (keydown.enter)="finishEdit(todo, $event)"
              (keydown.escape)="cancelEdit($event)"
              (blur)="finishEdit(todo, $event)"
            />
          } @else {
            <span
              #todoText
              class="text"
              role="button"
              tabindex="0"
              [attr.aria-label]="'Edit ' + todo.text + '. Alt+Up or Alt+Down to move it.'"
              (click)="startEdit(todo)"
              (keydown.enter)="startEdit(todo)"
              (keydown)="reorderWithKeys(todo, index, $event)"
              >{{ todo.text }}</span
            >
          }
          <button type="button" class="button icon-only danger delete" [attr.aria-label]="'Delete ' + todo.text" title="Delete" (click)="remove(todo)">
            ✕
          </button>
        </li>
      }
    </ul>

    @if (!open().length && !completed().length) {
      <p class="hint empty">Nothing to do. Type a Todo above and press Enter.</p>
    }

    @if (completed().length) {
      <button type="button" class="completed-toggle" [attr.aria-expanded]="showCompleted()" (click)="showCompleted.set(!showCompleted())">
        <span class="chevron" [class.expanded]="showCompleted()" aria-hidden="true">›</span>
        Completed ({{ completed().length }})
      </button>
      @if (showCompleted()) {
        <ul class="completed" aria-label="Completed Todos">
          @for (todo of completed(); track todo.id) {
            <li class="todo done">
              <input type="checkbox" class="checkbox" checked [attr.aria-label]="'Uncheck ' + todo.text" (change)="uncomplete(todo)" />
              <span class="text">{{ todo.text }}</span>
              <button type="button" class="button icon-only danger delete" [attr.aria-label]="'Delete ' + todo.text" title="Delete" (click)="remove(todo)">
                ✕
              </button>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      overflow: auto;
      padding: 1rem 0.75rem;
      border-radius: var(--radius-widget);
      scrollbar-width: thin;
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .todo {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-height: 2rem;
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-control);
      font-size: 0.875rem;
    }
    .open .todo {
      cursor: grab;
    }
    .todo:hover {
      background: var(--control-fill);
    }
    /* A Todo chosen in the Launcher. The highlight fades out when it ends. */
    .todo {
      transition: background-color 600ms ease-out, box-shadow 600ms ease-out;
    }
    .todo.highlighted {
      background: var(--selected-fill);
      box-shadow: inset 0 0 0 1.5px var(--edit-outline);
      transition: none;
    }
    .text {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
      cursor: text;
    }
    .text:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
      border-radius: var(--radius-control);
    }
    .edit {
      flex: 1;
      padding: 0.25rem 0.4rem;
    }
    /* The shared danger icon button, shown only on hover or keyboard focus. */
    .delete {
      flex: none;
      background: none;
      opacity: 0;
    }
    .todo:hover .delete,
    .delete:focus-visible {
      opacity: 1;
    }
    .done .text {
      color: var(--text-secondary);
      text-decoration: line-through;
      cursor: default;
    }
    .completed-toggle {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-top: 0.25rem;
      padding: 0.25rem 0.375rem;
      border: 0;
      border-radius: var(--radius-control);
      background: none;
      color: var(--text-secondary);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 650;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .completed-toggle:hover {
      color: var(--text-primary);
    }
    .completed-toggle:focus-visible {
      outline: 2px solid var(--focus-ring);
    }
    .chevron {
      display: inline-block;
      font-size: 1rem;
      line-height: 1;
    }
    .chevron.expanded {
      transform: rotate(90deg);
    }
    .empty {
      padding: 0.25rem 0.375rem;
    }
    /* Drag-reorder. Angular CDK moves the rows; these are its states. The preview is a .material surface. */
    .cdk-drag-preview {
      box-sizing: border-box;
      cursor: grabbing;
    }
    .cdk-drag-placeholder {
      opacity: 0.25;
    }
    /* CDK slides the other rows aside with transforms. A short ease, only when motion is welcome. */
    @media (prefers-reduced-motion: no-preference) {
      .cdk-drag-animating,
      .cdk-drop-list-dragging .todo:not(.cdk-drag-placeholder) {
        transition: transform 180ms cubic-bezier(0.2, 0, 0, 1);
      }
    }
  `,
})
export class TodosWidget {
  protected readonly webos = inject(WebOSCore);
  private readonly highlight = inject(TodoHighlight);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly editField = viewChild<ElementRef<HTMLInputElement>>('editField');
  private readonly todoTexts = viewChildren<ElementRef<HTMLElement>>('todoText');

  protected readonly open = computed(() => this.webos.openTodos() ?? []);
  protected readonly completed = computed(() => this.webos.completedTodos() ?? []);
  /** The id of the Todo whose text is being edited, if any. */
  protected readonly editingId = signal<string | undefined>(undefined);
  protected readonly showCompleted = signal(false);
  /** The Todo highlighted after being chosen in the Launcher, if any. */
  protected readonly highlightedId = signal<string | undefined>(undefined);
  private highlightTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const request = this.highlight.request();
      if (request) untracked(() => this.highlightTodo(request.todoId));
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.highlightTimer));
  }

  /** Scrolls a Todo into view, focuses its text and highlights it for a moment. */
  private highlightTodo(todoId: string): void {
    this.highlight.done();
    this.editingId.set(undefined);
    this.highlightedId.set(todoId);
    clearTimeout(this.highlightTimer);
    this.highlightTimer = setTimeout(() => this.highlightedId.set(undefined), HIGHLIGHT_MS);
    afterNextRender(
      () => {
        const row = this.host.querySelector<HTMLElement>(`[data-todo="${CSS.escape(todoId)}"]`);
        row?.scrollIntoView({ block: 'nearest' });
        row?.querySelector<HTMLElement>('.text')?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  protected add(field: HTMLInputElement, event: Event): void {
    event.preventDefault();
    const text = field.value;
    field.value = '';
    this.webos.send((core) => core.todos.add(text));
  }

  protected complete(todo: Todo): void {
    this.webos.send((core) => core.todos.complete(todo.id));
  }

  protected uncomplete(todo: Todo): void {
    this.webos.send((core) => core.todos.uncomplete(todo.id));
  }

  protected remove(todo: Todo): void {
    this.webos.send((core) => core.todos.delete(todo.id));
  }

  protected startEdit(todo: Todo): void {
    this.editingId.set(todo.id);
    afterNextRender(
      () => {
        const field = this.editField()?.nativeElement;
        field?.focus();
        field?.select();
      },
      { injector: this.injector },
    );
  }

  /** Saves the edit on Enter or when the field loses focus. Blank text keeps the old text. */
  protected finishEdit(todo: Todo, event: Event): void {
    if (this.editingId() !== todo.id) return;
    const text = (event.target as HTMLInputElement).value;
    this.editingId.set(undefined);
    this.webos.send((core) => core.todos.editText(todo.id, text));
  }

  protected cancelEdit(event: Event): void {
    event.stopPropagation();
    this.editingId.set(undefined);
  }

  protected drop(event: CdkDragDrop<unknown, unknown, Todo>): void {
    const todo = event.item.data;
    this.webos.send((core) => core.todos.move(todo.id, event.currentIndex));
  }

  /** Alt+↑ / Alt+↓ on a Todo's text move it, so reordering doesn't need a mouse. */
  protected reorderWithKeys(todo: Todo, index: number, event: KeyboardEvent): void {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const toIndex = event.key === 'ArrowUp' ? index - 1 : index + 1;
    // Already at the top: nothing to move, so nothing to save.
    if (toIndex < 0) return;
    this.webos.send((core) => core.todos.move(todo.id, toIndex));
    // Keep focus on the moved Todo's text once it has re-rendered in its new place.
    afterNextRender(
      () => {
        const texts = this.todoTexts();
        texts[Math.min(toIndex, texts.length - 1)]?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }
}
