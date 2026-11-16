import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import type { ClockFace, WidgetSize } from '../../core';
import { WebOSCore } from '../webos-core';

/** The dial's centre, in the SVG's own units. */
const C = 50;
/** The 60 minute marks, every fifth an hour mark. */
const MARKS = Array.from({ length: 60 }, (_, i) => ({ angle: i * 6, hour: i % 5 === 0 }));

/**
 * The Clock Widget: 12-hour time, today's date and a greeting by time of day.
 * It has no surface: thin type straight on the wallpaper. At its medium and
 * large sizes (the middle of the Stage layout's top band, or its full width)
 * it centres a larger greeting and a very large time.
 *
 * Clicking the time turns it into an analog clock, and clicking the clock
 * turns it back; the choice is kept for every new tab. The minute hand steps
 * once a minute with the core's tick; the second hand sweeps with a CSS
 * animation started where the second hand is, and is left out under reduced
 * motion.
 */
@Component({
  selector: 'webos-clock-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.centred]': "size() !== 'S'",
    '[class.analog]': "webos.clockFace() === 'analog'",
    '(document:visibilitychange)': 'restartSweep()',
  },
  template: `
    <p class="greeting">{{ webos.greeting() }}</p>
    @if (webos.clockFace() === 'analog') {
      <button type="button" class="face dial-face" [attr.aria-label]="webos.time() + '. Show the time in digits'" (click)="switchTo('digital')">
        <svg class="dial" viewBox="0 0 100 100" aria-hidden="true">
          @for (mark of marks; track mark.angle) {
            <line
              [class.hour-mark]="mark.hour"
              class="mark"
              [attr.x1]="c"
              [attr.x2]="c"
              [attr.y1]="mark.hour ? 3 : 3.5"
              [attr.y2]="mark.hour ? 10 : 6.5"
              [attr.transform]="'rotate(' + mark.angle + ' 50 50)'"
            />
          }
          @if (webos.clockHands(); as hands) {
            <line class="hand hour" [attr.x1]="c" [attr.x2]="c" y1="55" y2="24" [attr.transform]="'rotate(' + hands.hour + ' 50 50)'" />
            <line class="hand minute" [attr.x1]="c" [attr.x2]="c" y1="56" y2="10" [attr.transform]="'rotate(' + hands.minute + ' 50 50)'" />
          }
          <!-- A new sweep, its element made afresh, each time it is started. -->
          @for (sweep of [sweep()]; track sweep) {
            <g class="second-sweep" [style.animation-delay.s]="sweep.delay">
              <line class="hand second" [attr.x1]="c" [attr.x2]="c" y1="60" y2="8" />
            </g>
          }
          <circle class="pin" [attr.cx]="c" [attr.cy]="c" r="1.6" />
        </svg>
      </button>
    } @else {
      <button type="button" class="face" [attr.aria-label]="webos.time() + '. Show an analog clock'" (click)="switchTo('analog')">
        <time class="time" aria-hidden="true">{{ webos.time() }}</time>
      </button>
    }
    <p class="date">{{ webos.date() }}</p>
  `,
  styleUrl: './clock-widget.css',
})
export class ClockWidget {
  protected readonly webos = inject(WebOSCore);
  readonly size = input.required<WidgetSize>();
  protected readonly c = C;
  protected readonly marks = MARKS;

  /**
   * The second hand's sweep: how far into its minute it starts, as a negative
   * delay. Started afresh each time the dial appears, whether clicked here or
   * chosen in another tab, and when the tab is shown again, as a machine that
   * slept may have held the animation back; in between it keeps time by itself.
   */
  protected readonly sweep = signal({ delay: 0 });

  constructor() {
    effect(() => {
      if (this.webos.clockFace() === 'analog') untracked(() => this.restartSweep());
    });
  }

  protected restartSweep(): void {
    if (document.hidden) return;
    this.sweep.set({ delay: -(this.webos.clockHandsNow()?.second ?? 0) / 6 });
  }

  protected switchTo(face: ClockFace): void {
    this.webos.send((core) => core.clock.setFace(face));
  }
}
