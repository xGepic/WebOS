import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { Countdown } from '../../../core';
import { WebOSCore } from '../../webos-core';

/**
 * The Countdowns App, opened from the Countdown Widget: the days the Widget
 * counts down to, soonest first with the days to go, and a form to add one or
 * change one picked with Edit.
 */
@Component({
  selector: 'webos-countdowns-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (webos.upcomingCountdowns()?.length) {
      <ul class="list" aria-label="Countdowns">
        @for (countdown of webos.upcomingCountdowns(); track countdown.id) {
          <li [class.editing]="editing() === countdown.id">
            <span class="what">
              <span class="title">{{ countdown.title }}</span>
              <span class="date">{{ countdown.label }}</span>
            </span>
            <span class="relative">{{ countdown.relative }}</span>
            <button type="button" class="button" (click)="edit(countdown, title, date)">Edit</button>
            <button type="button" class="button danger" (click)="remove(countdown)">Delete</button>
          </li>
        }
      </ul>
    } @else {
      <p class="hint empty">No Countdowns yet. Add a race, a release or a holiday below.</p>
    }

    <form (submit)="save(title, date, $event)">
      <h3 class="section-heading">{{ editing() ? 'Change Countdown' : 'New Countdown' }}</h3>
      <div class="row">
        <label class="field">
          <span>Title</span>
          <input #title class="text-field" type="text" maxlength="80" placeholder="e.g. Vienna City Marathon" autocomplete="off" />
        </label>
        <label class="field day">
          <span>Day</span>
          <input #date class="text-field" type="date" />
        </label>
      </div>
      <div class="actions">
        <button type="submit" class="button">{{ editing() ? 'Save' : 'Add' }}</button>
        @if (editing()) {
          <button type="button" class="button" (click)="cancel(title, date)">Cancel</button>
        }
      </div>
      @if (message(); as message) {
        <p class="hint" role="status">{{ message }}</p>
      }
    </form>

    <p class="hint">The Countdown Widget shows the days to go, soonest first. A Countdown is cleared once its day has passed.</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
      max-width: 36rem;
      padding: 1.5rem 1.75rem 2rem;
    }
    .list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.35rem 0.45rem 0.75rem;
      border-radius: var(--radius-inset);
      font-size: 0.875rem;
    }
    li:nth-child(odd) {
      background: var(--control-fill);
    }
    li.editing {
      outline: 1.5px solid var(--edit-outline);
    }
    .what {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
    }
    .title,
    .date {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .date {
      color: var(--text-secondary);
      font-size: 0.75rem;
    }
    .relative {
      margin-right: 0.5rem;
      color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .section-heading {
      margin-bottom: 0.75rem;
    }
    .row {
      display: flex;
      gap: 0.5rem;
    }
    .field {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .field.day {
      flex: none;
      width: 10rem;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    form .hint {
      margin-top: 0.5rem;
    }
    .hint {
      margin: 0;
    }
  `,
})
export class CountdownsApp {
  protected readonly webos = inject(WebOSCore);
  /** The Countdown the form is changing, if it is changing one rather than adding. */
  protected readonly editing = signal<string | undefined>(undefined);
  protected readonly message = signal<string | undefined>(undefined);

  protected async save(title: HTMLInputElement, date: HTMLInputElement, event: Event): Promise<void> {
    event.preventDefault();
    const input = { title: title.value, date: date.value };
    const id = this.editing();
    const saved = id
      ? await this.webos.send((core) => core.countdowns.edit(id, input))
      : await this.webos.send((core) => core.countdowns.add(input));
    if (!saved) {
      this.message.set('Give it a title and a day.');
      return;
    }
    this.cancel(title, date);
  }

  protected edit(countdown: Countdown, title: HTMLInputElement, date: HTMLInputElement): void {
    this.editing.set(countdown.id);
    this.message.set(undefined);
    title.value = countdown.title;
    date.value = countdown.date;
    title.focus();
  }

  protected cancel(title: HTMLInputElement, date: HTMLInputElement): void {
    this.editing.set(undefined);
    this.message.set(undefined);
    title.value = '';
    date.value = '';
  }

  protected remove(countdown: Countdown): void {
    if (this.editing() === countdown.id) this.editing.set(undefined);
    this.webos.send((core) => core.countdowns.delete(countdown.id));
  }
}
