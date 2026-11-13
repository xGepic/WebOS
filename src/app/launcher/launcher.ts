import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { ActionResult, AppId, LauncherResult } from '../../core';
import { openInBackgroundTab, openInThisTab } from '../../edges/tabs';
import { springTo } from '../../motion/springs';
import { DesktopEditor } from '../desktop/desktop-editor';
import { AppIcon } from '../dock/app-icon';
import { LinkIcon } from '../link-icon/link-icon';
import { Toasts } from '../toast/toasts';
import { TodoHighlight } from '../todos-widget/todo-highlight';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';
import { LauncherState } from './launcher-state';

/** The label each kind of result shows, so it's clear what choosing it does. */
const KIND_LABELS: Record<LauncherResult['kind'], string> = {
  action: 'Action',
  app: 'App',
  link: 'Link',
  todo: 'Todo',
  note: 'Note',
  bookmark: 'Bookmark',
  history: 'History',
  web: 'Web',
};

/** The secondary text beside a result's title: where a page leads, or when a Note was edited. */
function detailOf(result: LauncherResult): string | undefined {
  switch (result.kind) {
    case 'link':
    case 'bookmark':
    case 'history':
      return result.url;
    case 'note':
      return result.detail;
    default:
      return undefined;
  }
}

/** Input types that take typed text; the others (checkboxes, buttons…) don't. */
const TEXT_FIELDS =
  'textarea, select, input:not([type=checkbox], [type=radio], [type=button], [type=submit], [type=reset], [type=range], [type=color], [type=file], [type=image])';

/** Whether `target` is somewhere the user types text, where typing must not open the Launcher. */
function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.matches(TEXT_FIELDS));
}

/** ⌘K on a Mac, Ctrl+K elsewhere. */
function isLauncherShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';
}

/**
 * Whether the key types a visible character. AltGr counts as typing (it
 * reports Ctrl+Alt on Windows), so "@" on a German keyboard does. Spaces don't:
 * a query can't start with one, and Space presses the focused button.
 */
function isPrintable(event: KeyboardEvent): boolean {
  const shortcut = (event.ctrlKey || event.metaKey) && !event.getModifierState('AltGraph');
  return !shortcut && [...event.key].length === 1 && !/\s/.test(event.key);
}

/**
 * The Launcher: a search field over the Desktop that finds Apps, Links, Todos,
 * Notes, bookmarks and history as you type, runs quick actions ("new todo …",
 * "new note …", "uuid"), and always offers a Brave search last.
 *
 * It opens with ⌘/Ctrl+K, the Menu Bar button, or by typing a character while
 * no text field has focus (that character starts the query). It's driven
 * from the keyboard: the arrow keys move the selection, Enter chooses,
 * ⌘/Ctrl+Enter opens a Link or the web search in a background tab, and Esc or
 * a click outside closes it. An App opens in the Window; a Link or the web
 * search opens in this tab. A Note opens in the Notes App, and a Todo is
 * highlighted on the Todos Widget.
 */
@Component({
  selector: 'webos-launcher',
  imports: [AppIcon, LinkIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onDocumentKeydown($event)' },
  template: `
    @if (state.isOpen()) {
      <div #backdrop class="backdrop" (pointerdown)="close({ restoreFocus: true })"></div>
      <div #sheet class="sheet material material-raised" role="dialog" aria-label="Launcher" (mousedown)="keepFocusInField($event)">
        <div class="field">
          <svg class="search-icon" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
            <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <input
            #input
            class="query"
            type="text"
            role="combobox"
            aria-label="Search webOS, your bookmarks and history, and the web"
            aria-autocomplete="list"
            aria-controls="launcher-results"
            [attr.aria-expanded]="results().length > 0"
            [attr.aria-activedescendant]="selected() ? 'launcher-result-' + selectedIndex() : null"
            placeholder="Search, or type “new todo”, “new note” or “uuid”"
            autocomplete="off"
            spellcheck="false"
            [value]="state.query()"
            (input)="state.setQuery(input.value)"
            (keydown)="onFieldKeydown($event)"
          />
        </div>
        @if (results().length) {
          <ul id="launcher-results" class="results" role="listbox" aria-label="Results">
            @for (result of results(); track result.id; let i = $index) {
              <li
                #option
                class="result"
                role="option"
                [id]="'launcher-result-' + i"
                [attr.aria-selected]="i === selectedIndex()"
                (pointermove)="chosenIndex.set(i)"
                (click)="choose(result, $event.metaKey || $event.ctrlKey)"
                (auxclick)="chooseWithMiddleButton(result, $event)"
              >
                <span class="icon">
                  @switch (result.kind) {
                    @case ('app') {
                      <webos-app-icon [app]="result.app" />
                    }
                    @case ('link') {
                      <webos-link-icon class="link-icon" [link]="result" />
                    }
                    @case ('bookmark') {
                      <webos-link-icon class="link-icon" [link]="result" />
                    }
                    @case ('history') {
                      <webos-link-icon class="link-icon" [link]="result" />
                    }
                    @case ('action') {
                      <!-- A spark: something happens -->
                      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                        <path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z" fill="currentColor" />
                      </svg>
                    }
                    @case ('todo') {
                      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5" />
                      </svg>
                    }
                    @case ('note') {
                      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                        <path d="M4 2h5.5L12 4.5V14H4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
                        <path d="M6 8h4M6 10.5h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
                      </svg>
                    }
                    @case ('web') {
                      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4" />
                        <path d="M2 8h12M8 2c-2.2 2.4-2.2 9.6 0 12M8 2c2.2 2.4 2.2 9.6 0 12" fill="none" stroke="currentColor" stroke-width="1.2" />
                      </svg>
                    }
                  }
                </span>
                <span class="text">
                  <span class="title">{{ result.title }}</span>
                  @if (detailOf(result); as detail) {
                    <span class="detail">{{ detail }}</span>
                  }
                </span>
                <span class="kind">{{ kindLabels[result.kind] }}</span>
              </li>
            }
          </ul>
        } @else {
          <p class="hint launcher-hint">Find Apps, Links, Todos, Notes, bookmarks and history, or search the web.</p>
        }
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 30;
      background: var(--scrim);
    }
    .sheet {
      position: fixed;
      top: 16vh;
      inset-inline: 0;
      z-index: 31;
      box-sizing: border-box;
      width: min(40rem, calc(100vw - 2rem));
      max-height: 64vh;
      margin-inline: auto;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: var(--radius-window);
    }
    .field {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.125rem;
    }
    .search-icon {
      flex: none;
      color: var(--text-secondary);
    }
    .query {
      flex: 1;
      min-width: 0;
      padding: 0;
      border: 0;
      background: none;
      color: var(--text-primary);
      font: inherit;
      font-size: 1.25rem;
      letter-spacing: var(--tracking-title);
      outline: none;
    }
    .query::placeholder {
      color: var(--text-secondary);
      opacity: 0.6;
    }
    .results {
      margin: 0;
      padding: 0.375rem;
      overflow: auto;
      border-top: 1px solid var(--material-border);
      list-style: none;
      scrollbar-width: thin;
    }
    .result {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-control);
      cursor: pointer;
    }
    .result[aria-selected='true'] {
      background: var(--selected-fill);
    }
    .icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 1.5rem;
      height: 1.5rem;
      color: var(--text-secondary);
    }
    .icon webos-app-icon {
      width: 100%;
      height: 100%;
    }
    .link-icon {
      width: 1rem;
      height: 1rem;
    }
    .text {
      display: flex;
      flex: 1;
      min-width: 0;
      align-items: baseline;
      gap: 0.625rem;
    }
    .title,
    .detail {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .title {
      font-size: 0.9375rem;
      font-weight: 500;
    }
    .detail {
      color: var(--text-secondary);
      font-size: 0.8125rem;
    }
    .kind {
      flex: none;
      color: var(--text-secondary);
      font-size: 0.75rem;
      font-weight: 600;
    }
    .launcher-hint {
      padding: 0.875rem 1.125rem;
      border-top: 1px solid var(--material-border);
    }
  `,
})
export class Launcher {
  protected readonly state = inject(LauncherState);
  private readonly webos = inject(WebOSCore);
  private readonly window = inject(WindowState);
  private readonly editor = inject(DesktopEditor);
  private readonly todoHighlight = inject(TodoHighlight);
  private readonly toasts = inject(Toasts);
  private readonly injector = inject(Injector);
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');
  private readonly sheet = viewChild<ElementRef<HTMLElement>>('sheet');
  private readonly backdrop = viewChild<ElementRef<HTMLElement>>('backdrop');

  protected readonly kindLabels = KIND_LABELS;
  protected readonly detailOf = detailOf;
  /** What the Launcher found for the query in `resultsFor`. Searching is async: bookmarks and history come from the browser. */
  protected readonly results = signal<readonly LauncherResult[]>([]);
  private readonly resultsFor = signal('');
  /** Bumped on every search, so a slower, older search never replaces a newer one's results. */
  private searches = 0;
  /** Enter pressed before the results for `query` arrived: chosen once they do, unless more is typed first. */
  private pendingChoice: { query: string; inBackground: boolean } | undefined;
  /** Where the arrow keys or the pointer put the selection. Typing selects the first result again. */
  protected readonly chosenIndex = linkedSignal({ source: this.state.query, computation: () => 0 });
  /** The selected result's place in the list, kept on it when another tab's change shortens the list. */
  protected readonly selectedIndex = computed(() => Math.max(0, Math.min(this.chosenIndex(), this.results().length - 1)));
  protected readonly selected = computed(() => this.results()[this.selectedIndex()]);
  /** What had focus before the Launcher opened, to give it back when it closes. */
  private focusBefore: HTMLElement | undefined;

  constructor() {
    // Search as the query changes, and again when what can be found changes.
    effect(() => {
      const query = this.state.query();
      const search = ++this.searches;
      if (!this.state.isOpen()) {
        this.pendingChoice = undefined;
        this.results.set([]);
        this.resultsFor.set('');
        return;
      }
      this.webos.searchLauncher(query).then((results) => {
        if (search !== this.searches) return;
        this.results.set(results);
        this.resultsFor.set(query);
        const pending = this.pendingChoice;
        if (pending?.query !== query) return;
        this.pendingChoice = undefined;
        const selected = this.selected();
        if (selected) this.choose(selected, pending.inBackground);
      });
    });
    // Keep the selected result in view as the arrow keys move through a long list.
    effect(() => {
      const index = this.selectedIndex();
      if (!this.state.isOpen()) return;
      afterNextRender(
        () => this.sheet()?.nativeElement.querySelector(`#launcher-result-${index}`)?.scrollIntoView({ block: 'nearest' }),
        { injector: this.injector },
      );
    });
    // However it was opened (a key, the Menu Bar button), the Launcher appears and takes focus.
    effect(() => {
      if (!this.state.isOpen()) return;
      untracked(() => this.appear());
    });
  }

  /** ⌘/Ctrl+K opens or closes the Launcher; typing a character where no text field has focus opens it with that character. */
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;
    if (isLauncherShortcut(event)) {
      event.preventDefault();
      if (event.repeat) return;
      if (this.state.isOpen()) this.close({ restoreFocus: true });
      else this.state.open();
      return;
    }
    if (!isPrintable(event)) return;
    if (this.state.isOpen()) {
      // Keys typed in the moment before the field takes focus still go into the query.
      if (event.target === this.input()?.nativeElement) return;
      event.preventDefault();
      this.state.setQuery(this.state.query() + event.key);
    } else if (!isTextField(event.target)) {
      event.preventDefault();
      this.state.open(event.key);
    }
  }

  protected onFieldKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    const last = this.results().length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.chosenIndex.set(Math.min(this.selectedIndex() + 1, last));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.chosenIndex.set(Math.max(this.selectedIndex() - 1, 0));
        break;
      case 'Enter': {
        event.preventDefault();
        const inBackground = event.metaKey || event.ctrlKey;
        const result = this.selected();
        // Typed faster than the search: choose from what this query finds, not the last one.
        if (this.resultsFor() !== this.state.query()) this.pendingChoice = { query: this.state.query(), inBackground };
        else if (result) this.choose(result, inBackground);
        break;
      }
      case 'Escape':
        // Esc closes only the Launcher, not the Window or Edit Mode under it.
        event.preventDefault();
        event.stopPropagation();
        this.close({ restoreFocus: true });
        break;
      case 'Tab':
        // The field is the Launcher's only stop; focus stays in it while it's open.
        event.preventDefault();
        break;
    }
  }

  /**
   * Does what a result is for. An action runs; an App opens in the Window; a
   * Note opens in the Notes App; a Todo is highlighted on the Todos Widget. A
   * Link, bookmark, history entry or the web search opens in this tab, or in a
   * background tab when `inBackground`.
   */
  protected choose(result: LauncherResult, inBackground: boolean): void {
    switch (result.kind) {
      case 'action':
        this.run(result);
        break;
      case 'app':
        this.openApp(result.app);
        break;
      case 'note':
        this.openNote(result.noteId);
        break;
      case 'todo':
        this.showTodo(result.todoId);
        break;
      default:
        if (inBackground) {
          this.close({ restoreFocus: true });
          openInBackgroundTab(result.url).catch((error) => console.error('webOS could not open a tab', error));
        } else {
          this.close();
          openInThisTab(result.url);
        }
    }
  }

  /** Opens the Notes App on a Note, once it is selected, so the Window never shows the one before. */
  private async openNote(noteId: string): Promise<void> {
    this.close({ restoreFocus: this.window.app() === 'notes' });
    await this.webos.send((core) => core.notes.select(noteId));
    this.window.open('notes');
  }

  private openApp(app: AppId): void {
    // A Window that opens takes focus itself; one already showing this App gets it back.
    this.close({ restoreFocus: this.window.app() === app });
    this.window.open(app);
  }

  /** Brings the Todos Widget into view, shown if it was hidden, with the Todo highlighted. */
  private async showTodo(todoId: string): Promise<void> {
    this.close();
    this.window.close();
    this.editor.exit();
    if (this.webos.hiddenWidgets()?.includes('todos')) {
      const shown = await this.webos.send((core) => core.desktop.show('todos'));
      if (!shown) return this.toasts.show('No room on the Desktop to show the Todos Widget');
    }
    this.todoHighlight.highlight(todoId);
  }

  /**
   * Runs an action, or fills in a command still missing its text so it can be
   * typed. The Launcher closes first, so a second Enter can't run it again.
   */
  private async run(action: ActionResult): Promise<void> {
    if (action.queryToFill !== undefined) {
      this.state.setQuery(action.queryToFill);
      afterNextRender(
        () => {
          const input = this.input()?.nativeElement;
          input?.setSelectionRange(input.value.length, input.value.length);
        },
        { injector: this.injector },
      );
      return;
    }
    // A new Note opens in the Window, which takes focus; anything else gives focus back.
    this.close({ restoreFocus: action.action !== 'new-note' || this.window.app() === 'notes' });
    const outcome = await this.webos.send((core) => core.launcher.run(action));
    switch (outcome?.kind) {
      case 'todo-added':
        this.toasts.show(`Added “${action.text}” to Todos`);
        break;
      case 'note-created':
        this.window.open('notes');
        break;
      case 'copy':
        navigator.clipboard.writeText(outcome.text).then(
          () => this.toasts.show('UUID copied'),
          (error) => {
            console.error('webOS could not copy to the clipboard', error);
            this.toasts.show('Couldn’t copy the UUID');
          },
        );
        break;
    }
  }

  /** Clicking anywhere in the Launcher keeps focus in its field, so the keyboard keeps working there. */
  protected keepFocusInField(event: MouseEvent): void {
    if (event.target !== this.input()?.nativeElement) event.preventDefault();
  }

  /** A middle-click opens a Link, bookmark, history entry or the web search in a background tab, as it would on a link. */
  protected chooseWithMiddleButton(result: LauncherResult, event: MouseEvent): void {
    if (event.button !== 1) return;
    event.preventDefault();
    this.choose(result, true);
  }

  protected close({ restoreFocus = false } = {}): void {
    this.state.close();
    if (restoreFocus && this.focusBefore?.isConnected) this.focusBefore.focus({ preventScroll: true });
    this.focusBefore = undefined;
  }

  /** Remembers where focus was, then springs the Launcher in (a fade under reduced motion) and focuses its field. */
  private appear(): void {
    const active = document.activeElement;
    this.focusBefore = active instanceof HTMLElement && active !== document.body ? active : undefined;
    afterNextRender(
      () => {
        const input = this.input()?.nativeElement;
        const sheet = this.sheet()?.nativeElement;
        const backdrop = this.backdrop()?.nativeElement;
        if (!input || !sheet || !backdrop) return;
        input.focus({ preventScroll: true });
        input.setSelectionRange(input.value.length, input.value.length);
        springTo(backdrop, { opacity: [0, 1] });
        springTo(sheet, { opacity: [0, 1], scale: [0.97, 1], y: [-6, 0] });
      },
      { injector: this.injector },
    );
  }
}
