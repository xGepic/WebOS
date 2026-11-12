import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { Countdown } from '../../../core';
import { WebOSCore } from '../../webos-core';

/**
 * Settings › Countdowns: the days the Countdown Widget counts down to. Each
 * has a title and a day; one can be changed by editing it in the form.
 */
@Component({
  selector: 'webos-countdown-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="settings-countdowns">
      <h3 id="settings-countdowns" class="section-heading">Countdowns</h3>
      @if (webos.countdowns()?.length) {
        <ul class="list">
          @for (countdown of webos.countdowns(); track countdown.id) {
            <li [class.editing]="editing() === countdown.id">
              <span class="title">{{ countdown.title }}</span>
              <span class="date">{{ countdown.date }}</span>
              <button type="button" class="button" (click)="edit(countdown, title, date)">Edit</button>
              <button type="button" class="button danger" (click)="remove(countdown)">Delete</button>
            </li>
          }
        </ul>
      }
      <form (submit)="save(title, date, $event)">
        <div class="row">
          <label class="field">
            <span>{{ editing() ? 'Title' : 'New Countdown' }}</span>
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
      </form>
      @if (message(); as message) {
        <p class="hint" role="status">{{ message }}</p>
      }
      <p class="hint">The Countdown Widget shows the days to go, soonest first. A Countdown is cleared once its day has passed.</p>
    </section>
  `,
  styles: `
    section {
      max-width: 30rem;
    }
    .list {
      margin: 0 0 1rem;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.35rem 0.35rem 0.75rem;
      border-radius: var(--radius-inset);
      font-size: 0.875rem;
    }
    li:nth-child(odd) {
      background: var(--control-fill);
    }
    li.editing {
      outline: 1.5px solid var(--edit-outline);
    }
    .title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .date {
      color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
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
      margin-top: 0.5rem;
    }
    .hint {
      margin-top: 0.5rem;
    }
    .section-heading {
      margin-bottom: 1rem;
    }
  `,
})
export class CountdownSettings {
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
