import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Toasts } from '../toast/toasts';
import { WebOSCore } from '../webos-core';
import { DayView } from './day-view';
import { SelectedDay } from './selected-day';

/**
 * The Today Widget: one day in full, today unless a day was picked in the
 * Calendar. Its holiday and Countdowns, the shown Apple Calendar events, and
 * sunrise and sunset in the Weather city; see the Day View.
 */
@Component({
  selector: 'webos-today-widget',
  imports: [DayView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    <h2 class="title-bar">{{ webos.widgetName('today') }}</h2>
    @if (day(); as day) {
      <webos-day-view
        [day]="day"
        [isToday]="!selected.pickedDate()"
        (back)="selected.reset()"
        (step)="selected.step($event)"
        (copy)="copy(day.date)"
      />
    }
  `,
  styles: `
    :host {
      container-type: size;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 1rem 0.75rem 0.75rem;
      border-radius: var(--radius-widget);
    }
    webos-day-view {
      flex: 1;
      min-height: 0;
      padding: 0 0.5rem;
    }
  `,
})
export class TodayWidget {
  protected readonly webos = inject(WebOSCore);
  protected readonly selected = inject(SelectedDay);
  private readonly toasts = inject(Toasts);

  protected readonly day = computed(() => this.webos.calendar.day(this.selected.date() ?? ''));

  protected async copy(date: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(date);
      this.toasts.show(`Copied ${date}`);
    } catch (error) {
      console.error('webOS could not copy to the clipboard', error);
      this.toasts.show('Couldn’t copy the date');
    }
  }
}
