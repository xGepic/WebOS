import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { ClipKind, ListedClip, SaveResult } from '../../../core';
import { Toasts } from '../../toast/toasts';
import { WebOSCore } from '../../webos-core';
import { WindowState } from '../../window/window-state';
import { DevUtilitiesHandoff } from '../dev-utilities/dev-utilities-handoff';
import { PinIcon } from '../notes/pin-icon';

/** How many lines of a Clip show until it is expanded. */
const PREVIEW_LINES = 3;
/** A Clip longer than this may run past the Window's width even on few lines, so it can be expanded too. */
const PREVIEW_CHARACTERS = 240;

/** The Dev Utilities tab each kind of Clip opens in, by name. */
const OPEN_IN: Record<ClipKind, string> = {
  json: 'JSON',
  timestamp: 'Timestamp',
  base64: 'Base64',
};

/** What each outcome of a paste says. */
const SAVED: Record<SaveResult, string> = {
  saved: 'Clip saved',
  moved: 'Already saved: moved to the top',
  empty: 'Nothing to save: that was only whitespace',
  'too-long': 'Too long to save: over 100,000 characters',
};

/** The shortcut that saves a Clip, as this machine writes it. */
const PASTE_SHORTCUT = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘V' : 'Ctrl+V';

/**
 * The Clipboard App, in the Dock: texts the user pastes in, kept as Clips to
 * copy back later. ⌘/Ctrl+V anywhere in the App saves the clipboard's text;
 * webOS never reads the clipboard by itself. A click on a Clip copies it.
 * Pinned Clips are listed first and never dropped; of the rest, the newest 50
 * are kept. A Clip that is JSON, a timestamp or Base64 opens in that Dev
 * Utilities tab.
 */
@Component({
  selector: 'webos-clipboard-app',
  imports: [PinIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:paste)': 'paste($event)' },
  template: `
    @if (clips().length) {
      <div class="header">
        <p class="hint">
          Press <kbd>{{ shortcut }}</kbd> to save what you copied. Click a Clip to copy it again.
        </p>
        @if (unpinnedCount()) {
          @if (confirmingClear()) {
            <div class="confirm" role="alert">
              <span
                >Delete
                {{
                  unpinnedCount() === 1
                    ? 'the unpinned Clip'
                    : 'all ' + unpinnedCount() + ' unpinned Clips'
                }}?</span
              >
              <button type="button" class="button danger" (click)="clearUnpinned()">Delete</button>
              <button type="button" class="button" (click)="confirmingClear.set(false)">
                Cancel
              </button>
            </div>
          } @else {
            <button type="button" class="button" (click)="confirmingClear.set(true)">
              Clear Unpinned
            </button>
          }
        }
      </div>

      <ul class="list" aria-label="Clips">
        @for (clip of clips(); track clip.id) {
          <li [class.pinned]="clip.pinned">
            <button
              type="button"
              class="clip"
              [attr.aria-label]="'Copy: ' + firstLine(clip)"
              (click)="copy(clip)"
            >
              @if (expanded().has(clip.id)) {
                <span class="text full">{{ clip.text }}</span>
              } @else {
                <span class="text">
                  @for (line of preview(clip); track $index) {
                    <span class="line">{{ line || ' ' }}</span>
                  }
                </span>
              }
              <span class="meta">
                @if (clip.pinned) {
                  <webos-pin-icon /><span class="visually-hidden">Pinned, </span>
                }
                {{ clip.saved }} · {{ size(clip) }}
              </span>
            </button>
            <div class="actions">
              @if (clip.kind; as kind) {
                <button type="button" class="button" (click)="openIn(clip, kind)">
                  Open in {{ openInName[kind] }}
                </button>
              }
              @if (canExpand(clip)) {
                <button
                  type="button"
                  class="button"
                  [attr.aria-expanded]="expanded().has(clip.id)"
                  (click)="toggleExpanded(clip)"
                >
                  {{ expanded().has(clip.id) ? 'Show Less' : 'Show All' }}
                </button>
              }
              <button
                type="button"
                class="button icon-only"
                [attr.aria-label]="clip.pinned ? 'Unpin' : 'Pin'"
                [title]="
                  clip.pinned
                    ? 'Unpin: it can be dropped again'
                    : 'Pin: never dropped, and listed first'
                "
                [attr.aria-pressed]="clip.pinned"
                (click)="setPinned(clip, !clip.pinned)"
              >
                <webos-pin-icon />
              </button>
              <button type="button" class="button danger" (click)="remove(clip)">Delete</button>
            </div>
          </li>
        }
      </ul>
    } @else {
      <div class="empty">
        <p>No Clips yet.</p>
        <p class="hint">
          Copy something anywhere, come back here and press <kbd>{{ shortcut }}</kbd>.
        </p>
      </div>
    }

    <p class="hint local">
      Clips stay on this machine. The newest 50 are kept, and pinned ones until you delete them.
    </p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 100%;
      box-sizing: border-box;
      padding: 1.25rem 1.75rem 1.5rem;
    }
    .header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      min-height: 2rem;
    }
    .confirm {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }
    kbd {
      padding: 0.05rem 0.35rem;
      border: 1px solid var(--material-border);
      border-radius: 0.3rem;
      background: var(--control-fill);
      color: var(--text-primary);
      font: inherit;
      font-size: 0.75rem;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem 0.25rem 0.25rem;
      border-radius: var(--radius-inset);
      background: var(--control-fill);
    }
    li.pinned {
      box-shadow: inset 2px 0 0 var(--accent);
    }
    .clip {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.3rem;
      min-width: 0;
      padding: 0.45rem 0.6rem;
      border: 0;
      border-radius: var(--radius-control);
      background: none;
      color: var(--text-primary);
      font: inherit;
      text-align: left;
      cursor: copy;
    }
    .clip:hover {
      background: var(--control-fill-hover);
    }
    .clip:active {
      background: var(--control-fill-active);
    }
    .clip:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 1px;
    }
    .text {
      display: flex;
      flex-direction: column;
      width: 100%;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      line-height: 1.55;
    }
    .line {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: pre;
    }
    .text.full {
      display: block;
      max-height: 24rem;
      overflow: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .meta {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      color: var(--text-secondary);
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
    }
    .actions {
      display: flex;
      flex: none;
      align-items: center;
      gap: 0.375rem;
      padding-top: 0.3rem;
    }
    .actions .button {
      padding: 0.3rem 0.65rem;
      font-size: 0.75rem;
    }
    .actions .button.icon-only {
      width: 1.9rem;
      padding: 0.3rem 0;
    }
    .actions .icon-only webos-pin-icon {
      width: 0.8125rem;
      height: 0.8125rem;
    }
    .actions .button[aria-pressed='true'] {
      color: var(--accent);
    }
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.375rem;
      padding: 3rem 1rem;
      text-align: center;
    }
    .empty p {
      margin: 0;
    }
    .local {
      margin-top: auto;
    }
  `,
})
export class ClipboardApp {
  private readonly webos = inject(WebOSCore);
  private readonly window = inject(WindowState);
  private readonly toasts = inject(Toasts);
  private readonly handoff = inject(DevUtilitiesHandoff);

  protected readonly shortcut = PASTE_SHORTCUT;
  protected readonly openInName = OPEN_IN;
  protected readonly clips = computed(() => this.webos.clips() ?? []);
  protected readonly unpinnedCount = computed(
    () => this.clips().filter((clip) => !clip.pinned).length,
  );
  protected readonly confirmingClear = signal(false);
  /** The Clips shown in full. Forgotten when the App closes. */
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  /**
   * ⌘/Ctrl+V while the App is open saves the clipboard's text, unless it is
   * pasted into a text field. Images, files and empty text save nothing.
   */
  protected async paste(event: ClipboardEvent): Promise<void> {
    if (this.window.app() !== 'clipboard' || isTextField(event.target)) return;
    const data = event.clipboardData;
    if (!data) return;
    event.preventDefault();
    const text = data.getData('text/plain');
    if (!text && data.types.some((type) => type !== 'text/plain')) {
      this.toasts.show('Only text can be saved');
      return;
    }
    const result = await this.webos.send((core) => core.clips.save(text));
    if (result) this.toasts.show(SAVED[result]);
    else this.toasts.show("Couldn't save the Clip");
  }

  protected copy(clip: ListedClip): void {
    navigator.clipboard.writeText(clip.text).then(
      () => this.toasts.show('Copied'),
      (error) => {
        console.error('webOS could not copy to the clipboard', error);
        this.toasts.show("Couldn't copy");
      },
    );
  }

  /** Opens Dev Utilities on the Clip's tab, with the Clip in its input. */
  protected openIn(clip: ListedClip, kind: ClipKind): void {
    this.handoff.give(kind, clip.text);
    this.webos.send((core) => core.devUtilities.setActiveTab(kind));
    this.window.open('dev-utilities');
  }

  protected setPinned(clip: ListedClip, pinned: boolean): void {
    this.webos.send((core) => core.clips.setPinned(clip.id, pinned));
  }

  protected remove(clip: ListedClip): void {
    this.webos.send((core) => core.clips.delete(clip.id));
  }

  protected clearUnpinned(): void {
    this.confirmingClear.set(false);
    this.webos.send((core) => core.clips.clearUnpinned());
  }

  protected toggleExpanded(clip: ListedClip): void {
    this.expanded.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(clip.id)) next.add(clip.id);
      return next;
    });
  }

  protected preview(clip: ListedClip): string[] {
    return lines(clip.text).slice(0, PREVIEW_LINES);
  }

  protected canExpand(clip: ListedClip): boolean {
    return lines(clip.text).length > PREVIEW_LINES || clip.text.length > PREVIEW_CHARACTERS;
  }

  /** The first line with text in it, for the Clip's accessible name. */
  protected firstLine(clip: ListedClip): string {
    return (
      lines(clip.text)
        .find((line) => line.trim())
        ?.trim() ?? ''
    );
  }

  /** How big the Clip is: "1 line", "12 lines", or its characters for a single line. */
  protected size(clip: ListedClip): string {
    const count = lines(clip.text).length;
    if (count > 1) return `${count} lines`;
    return clip.text.length === 1
      ? '1 character'
      : `${clip.text.length.toLocaleString('en-US')} characters`;
  }
}

/** A text's lines, without a trailing empty one after a final line break. */
function lines(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
}

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
