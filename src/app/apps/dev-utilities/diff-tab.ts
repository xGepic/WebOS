import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { WebOSCore } from '../../webos-core';

/**
 * Dev Utilities › Diff: two texts compared line by line, as a unified diff.
 * Removed lines are red and added ones blue, with the part of a changed line
 * that differs marked, and long unchanged runs folded. It can ignore
 * whitespace. Nothing is shown until both texts have something in them.
 */
@Component({
  selector: 'webos-diff-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tab.css',
  template: `
    <div class="controls">
      <label class="option">
        <input type="checkbox" class="checkbox" [checked]="ignoreWhitespace()" (change)="ignoreWhitespace.set(!ignoreWhitespace())" />
        Ignore whitespace
      </label>
    </div>

    <div class="inputs">
      <div>
        <div class="labelled">
          <label class="label" for="diff-before">Before</label>
        </div>
        <textarea
          #beforeInput
          id="diff-before"
          class="text-field code"
          spellcheck="false"
          placeholder="The original text"
          (input)="before.set(beforeInput.value)"
        ></textarea>
      </div>
      <div>
        <div class="labelled">
          <label class="label" for="diff-after">After</label>
        </div>
        <textarea
          #afterInput
          id="diff-after"
          class="text-field code"
          spellcheck="false"
          placeholder="The changed text"
          (input)="after.set(afterInput.value)"
        ></textarea>
      </div>
    </div>

    @if (result(); as result) {
      @if (!result.ok) {
        <p class="error" role="status">{{ result.error }}</p>
      } @else if (result.identical) {
        <p class="label valid" role="status">{{ ignoreWhitespace() ? 'No differences beyond whitespace' : 'No differences' }}</p>
      } @else {
        <div>
          <div class="labelled">
            <span class="label" role="status">
              Differences
              <span class="count added-count" aria-hidden="true">+{{ result.added }}</span>
              <span class="count removed-count" aria-hidden="true">−{{ result.removed }}</span>
              <span class="visually-hidden">{{ result.added }} added, {{ result.removed }} removed</span>
            </span>
          </div>
          <ol class="diff code">
            @for (row of result.rows; track $index) {
              @if (row.kind === 'skipped') {
                <li class="row skipped">
                  <span class="text">{{ row.lines }} unchanged lines</span>
                </li>
              } @else {
                <li class="row" [class]="row.kind">
                  <span class="number" aria-hidden="true">{{ row.kind === 'added' ? '' : row.before }}</span>
                  <span class="number" aria-hidden="true">{{ row.kind === 'removed' ? '' : row.after }}</span>
                  <span class="sign" aria-hidden="true">{{ row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : '' }}</span>
                  <span class="text">
                    @if (row.kind !== 'same') {
                      <span class="visually-hidden">{{ row.kind === 'added' ? 'Added:' : 'Removed:' }}</span>
                    }
                    <!-- Each part in its own element: this text keeps its whitespace, so no loose template whitespace may sit beside it. -->
                    @for (part of row.parts; track $index) {
                      @if (part.changed) {
                        <mark>{{ part.text }}</mark>
                      } @else {
                        <span>{{ part.text }}</span>
                      }
                    }
                  </span>
                </li>
              }
            }
          </ol>
        </div>
      }
    }
  `,
  styles: `
    .option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }
    .inputs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: 1rem;
    }
    p.label {
      margin: 0;
    }
    .count {
      margin-left: 0.375rem;
      font-family: var(--font-mono);
      font-weight: 500;
    }
    .added-count {
      color: var(--accent);
    }
    .removed-count {
      color: var(--danger);
    }
    .diff {
      max-height: 24rem;
      margin: 0;
      padding: 0.5rem 0;
      overflow: auto;
      border-radius: var(--radius-control);
      background: var(--control-fill);
      list-style: none;
      scrollbar-width: thin;
    }
    .row {
      display: grid;
      grid-template-columns: 2.75rem 2.75rem 1.5rem minmax(0, 1fr);
    }
    .number {
      padding-right: 0.5rem;
      color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
      text-align: right;
      user-select: none;
    }
    .sign {
      text-align: center;
      user-select: none;
    }
    .text {
      padding-right: 0.875rem;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .removed {
      background: var(--diff-removed-fill);
    }
    .removed .sign {
      color: var(--danger);
    }
    .added {
      background: var(--diff-added-fill);
    }
    .added .sign {
      color: var(--accent);
    }
    mark {
      border-radius: 2px;
      color: inherit;
    }
    .removed mark {
      background: var(--diff-removed-mark);
    }
    .added mark {
      background: var(--diff-added-mark);
    }
    /* A folded run of unchanged lines sits in the text column, quieter than the lines. */
    .skipped {
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 0.75rem;
    }
    .skipped .text {
      grid-column: 4;
      padding-block: 0.25rem;
    }
  `,
})
export class DiffTab {
  private readonly webos = inject(WebOSCore);
  protected readonly before = signal('');
  protected readonly after = signal('');
  protected readonly ignoreWhitespace = signal(false);

  /** Nothing until both texts have something in them. */
  protected readonly result = computed(() => {
    const tools = this.webos.devUtilities();
    const before = this.before();
    const after = this.after();
    if (!tools || !before || !after) return undefined;
    return tools.diffText(before, after, { ignoreWhitespace: this.ignoreWhitespace() });
  });
}
