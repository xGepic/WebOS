import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { WidgetSize } from '../../core';
import { WebOSCore } from '../webos-core';

/**
 * The Clock Widget: 12-hour time, today's date and a greeting by time of day.
 * It has no surface: thin type straight on the wallpaper. At its medium and
 * large sizes (the middle of the Stage layout's top band, or its full width)
 * it centres a larger greeting and a very large time.
 */
@Component({
  selector: 'webos-clock-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.centred]': "size() !== 'S'" },
  template: `
    <p class="greeting">{{ webos.greeting() }}</p>
    <time class="time">{{ webos.time() }}</time>
    <p class="date">{{ webos.date() }}</p>
  `,
  styleUrl: './clock-widget.css',
})
export class ClockWidget {
  protected readonly webos = inject(WebOSCore);
  readonly size = input.required<WidgetSize>();
}
