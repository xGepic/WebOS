import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebOSCore } from '../../webos-core';

/**
 * Settings › GitHub: the personal access token the GitHub Widget reads the
 * contribution graph with. The token is never shown again once saved.
 */
@Component({
  selector: 'webos-github-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="settings-github">
      <h3 id="settings-github" class="section-heading">GitHub</h3>
      @if (webos.hasGitHubToken()) {
        <div class="current">
          <span>A token is set.</span>
          <button type="button" class="button" (click)="save('')">Remove</button>
        </div>
      }
      <form (submit)="save(token.value, $event); token.value = ''">
        <label for="settings-github-token">{{ webos.hasGitHubToken() ? 'Replace the token' : 'Personal access token' }}</label>
        <div class="row">
          <input
            #token
            id="settings-github-token"
            class="text-field"
            type="password"
            autocomplete="off"
            spellcheck="false"
            placeholder="github_pat_… or ghp_…"
          />
          <button type="submit" class="button">Save</button>
        </div>
      </form>
      <p class="hint">
        The GitHub Widget shows your contribution graph. Create a fine-grained token with no extra permissions, or a
        classic one with no scopes, on GitHub under Settings › Developer settings › Personal access tokens.
      </p>
      <p class="hint">The token is kept only on this machine, sent only to GitHub, and left out of backups.</p>
    </section>
  `,
  styles: `
    section {
      max-width: 26rem;
    }
    label {
      display: block;
      margin-bottom: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .current {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding: 0.5rem 0.5rem 0.5rem 0.75rem;
      border-radius: var(--radius-inset);
      background: var(--control-fill);
      font-size: 0.875rem;
    }
    .row {
      display: flex;
      gap: 0.5rem;
    }
    .hint {
      margin-top: 0.5rem;
    }
    .section-heading {
      margin-bottom: 1rem;
    }
  `,
})
export class GitHubSettings {
  protected readonly webos = inject(WebOSCore);

  protected save(token: string, event?: Event): void {
    event?.preventDefault();
    if (event && !token.trim()) return;
    this.webos.send((core) => core.github.setToken(token));
  }
}
