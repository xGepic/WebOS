import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ContributionDay, WidgetSize } from '../../core';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/** How many of the last weeks each size shows: half a year, three quarters, the whole year. */
const WEEKS_SHOWN: Record<WidgetSize, number> = { S: 26, M: 39, L: 53 };
/** A day's square and the gap after it, in the SVG's own units. */
const CELL = 10;
const GAP = 3;
/** Room left of the graph for the weekday labels and above it for the month labels, in the same units. */
const LEFT = 24;
const TOP = 14;

/**
 * The GitHub Widget: the contribution graph of the token's owner, as on their
 * GitHub profile, labelled with months and weekdays, under a line on today
 * and above the year's total and the current and longest streaks. The token
 * is set in Settings. Larger sizes show more weeks; the smallest leaves out
 * the line on today.
 */
@Component({
  selector: 'webos-github-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    <h2 class="title-bar">
      {{ webos.widgetName('github') }}
      @if (ready(); as github) {
        <span class="login">{{ github.login }}</span>
      }
    </h2>
    @if (webos.github(); as github) {
      @if (github.status === 'ready') {
        <p class="headline">
          <span class="today"><strong class="count">{{ github.today }}</strong> today</span>
          <span class="note">{{ github.message }}</span>
        </p>
        <svg
          class="graph"
          [attr.viewBox]="viewBox()"
          preserveAspectRatio="xMaxYMid meet"
          role="img"
          [attr.aria-label]="github.total + ' contributions in the last year'"
        >
          @for (label of monthLabels(); track label.x) {
            <text class="label" [attr.x]="label.x" [attr.y]="-labelGap">{{ label.text }}</text>
          }
          @for (row of weekdayRows; track row.day) {
            <text class="label weekday" [attr.x]="-labelGap" [attr.y]="row.day * (cell + gap) + cell / 2">{{ row.text }}</text>
          }
          @for (week of weeks(); track $index; let w = $index) {
            @for (day of week; track $index; let d = $index) {
              @if (day) {
                <rect
                  [attr.x]="w * (cell + gap)"
                  [attr.y]="d * (cell + gap)"
                  [attr.width]="cell"
                  [attr.height]="cell"
                  rx="2"
                  [attr.class]="'level-' + day.level"
                >
                  <title>{{ describe(day) }}</title>
                </rect>
              }
            }
          }
        </svg>
        <p class="summary">
          <span><strong>{{ github.total }}</strong> in the last year</span>
          <span>Streak <strong>{{ github.currentStreak }}</strong> {{ github.currentStreak === 1 ? 'day' : 'days' }}</span>
          <span>Longest <strong>{{ github.longestStreak }}</strong></span>
          @if (github.problem || github.updatedAt) {
            <span class="stale">
              {{ github.problem === 'token' ? "Token refused" : github.updatedAt ? 'Updated ' + github.updatedAt : 'Offline' }}
            </span>
          }
          <span class="legend" aria-hidden="true">
            Less
            @for (level of levels; track level) {
              <span class="swatch" [class]="'level-' + level"></span>
            }
            More
          </span>
        </p>
      } @else if (github.status === 'loading') {
        <p class="message">Loading your contributions…</p>
      } @else if (github.status === 'no-token') {
        <div class="widget-empty">
          <p>See your GitHub contribution graph here.</p>
          <button type="button" class="button" (click)="window.open('settings')">Add a token in Settings</button>
        </div>
      } @else if (github.status === 'failed' && github.problem === 'token') {
        <div class="widget-empty">
          <p>GitHub didn't accept the token.</p>
          <button type="button" class="button" (click)="window.open('settings')">Change the token</button>
        </div>
      } @else {
        <p class="message">GitHub can't be reached right now.</p>
      }
    }
  `,
  styleUrl: './github-widget.css',
})
export class GitHubWidget {
  protected readonly webos = inject(WebOSCore);
  protected readonly window = inject(WindowState);
  readonly size = input.required<WidgetSize>();
  protected readonly cell = CELL;
  protected readonly gap = GAP;
  protected readonly labelGap = 4;
  protected readonly levels = [0, 1, 2, 3, 4];
  /** GitHub labels every other row, so the labels never crowd each other. */
  protected readonly weekdayRows = [
    { day: 1, text: 'Mon' },
    { day: 3, text: 'Wed' },
    { day: 5, text: 'Fri' },
  ];

  protected readonly ready = computed(() => {
    const github = this.webos.github();
    return github?.status === 'ready' ? github : undefined;
  });

  /** The last weeks this size shows, oldest first. */
  protected readonly weeks = computed(() => this.ready()?.weeks.slice(-WEEKS_SHOWN[this.size()]) ?? []);
  protected readonly graphWidth = computed(() => Math.max(1, this.weeks().length * (CELL + GAP) - GAP));
  protected readonly viewBox = computed(() => `${-LEFT} ${-TOP} ${this.graphWidth() + LEFT} ${7 * (CELL + GAP) - GAP + TOP}`);

  /** The month labels over the weeks this size shows. */
  protected readonly monthLabels = computed(() => {
    const months = this.ready()?.months.slice(-WEEKS_SHOWN[this.size()]) ?? [];
    return months.flatMap((text, week) => (text ? [{ text, x: week * (CELL + GAP) }] : []));
  });

  protected describe(day: ContributionDay): string {
    const date = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `${day.count === 0 ? 'No' : day.count} contribution${day.count === 1 ? '' : 's'} on ${date}`;
  }
}
