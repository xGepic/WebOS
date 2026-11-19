import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';

/**
 * The GitHub Widget: the commits of the token's owner this month and last
 * month, over all their repositories, side by side, large and thin like the
 * New Tabs count. The token is set in Settings. It opens no App.
 */
@Component({
  selector: 'webos-github-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material' },
  template: `
    <h2 class="title-bar">
      {{ webos.widgetName('github') }}
      @if (webos.github(); as github) {
        @if (github.status === 'ready') {
          <span class="login">{{ github.login }}</span>
        }
      }
    </h2>
    @if (webos.github(); as github) {
      @if (github.status === 'ready') {
        <dl class="months">
          <div class="month">
            <dt class="label">{{ github.thisMonth === 1 ? 'commit' : 'commits' }} this month</dt>
            <dd class="number">{{ github.thisMonth }}</dd>
          </div>
          <div class="month last">
            <dt class="label">{{ github.lastMonth === 1 ? 'commit' : 'commits' }} last month</dt>
            <dd class="number">{{ github.lastMonth }}</dd>
          </div>
        </dl>
        @if (github.problem || github.updatedAt) {
          <p class="stale">
            {{ github.problem === 'token' ? 'Token refused' : github.updatedAt ? 'Updated ' + github.updatedAt : 'Offline' }}
          </p>
        }
      } @else if (github.status === 'loading') {
        <p class="message">Counting your commits…</p>
      } @else if (github.status === 'no-token') {
        <div class="widget-empty">
          <p>See your commits this month here.</p>
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
}
