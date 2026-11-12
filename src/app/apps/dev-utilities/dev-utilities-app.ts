import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  viewChildren,
} from '@angular/core';
import type { DevUtilitiesTab } from '../../../core';
import { WebOSCore } from '../../webos-core';
import { Base64Tab } from './base64-tab';
import { JsonTab } from './json-tab';
import { JwtTab } from './jwt-tab';
import { TimestampTab } from './timestamp-tab';
import { UuidTab } from './uuid-tab';

/**
 * The Dev Utilities App: offline conversions in tabs. The active tab is remembered.
 * Every tab stays rendered while the App is open, with only the active one
 * shown, so switching tabs keeps what was typed in each.
 */
@Component({
  selector: 'webos-dev-utilities-app',
  imports: [JsonTab, Base64Tab, JwtTab, UuidTab, TimestampTab],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="segmented tabs" role="tablist" aria-label="Dev Utilities" (keydown)="moveWithKeys($event)">
      @for (tab of tabs(); track tab.id) {
        <button
          #tabButton
          type="button"
          role="tab"
          class="button tab"
          [id]="'dev-tab-' + tab.id"
          [attr.aria-selected]="tab.id === active()"
          [attr.aria-controls]="'dev-panel-' + tab.id"
          [tabIndex]="tab.id === active() ? 0 : -1"
          (click)="choose(tab.id)"
        >
          {{ tab.name }}
        </button>
      }
    </div>

    @for (tab of tabs(); track tab.id) {
      <section role="tabpanel" [id]="'dev-panel-' + tab.id" [attr.aria-labelledby]="'dev-tab-' + tab.id" [hidden]="tab.id !== active()">
        @switch (tab.id) {
          @case ('json') {
            <webos-json-tab />
          }
          @case ('base64') {
            <webos-base64-tab />
          }
          @case ('jwt') {
            <webos-jwt-tab />
          }
          @case ('uuid') {
            <webos-uuid-tab />
          }
          @case ('timestamp') {
            <webos-timestamp-tab />
          }
        }
      </section>
    }

    <p class="hint local">Everything here runs on this machine. Nothing you paste is sent anywhere.</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.25rem 1.75rem 1.5rem;
    }
    /* The shared segmented control, a little larger as the App's main navigation. */
    .tabs {
      align-self: flex-start;
    }
    .segmented > .tab {
      padding: 0.4rem 0.9rem;
      font-size: 0.8125rem;
    }
    .local {
      margin-top: auto;
    }
  `,
})
export class DevUtilitiesApp {
  private readonly webos = inject(WebOSCore);
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  protected readonly tabs = computed(() => this.webos.devUtilities()?.tabs ?? []);
  protected readonly active = computed(() => this.webos.devUtilitiesTab() ?? 'json');

  protected choose(tab: DevUtilitiesTab): void {
    this.webos.send((core) => core.devUtilities.setActiveTab(tab));
  }

  /** Arrow keys, Home and End move between tabs, as in any tab list. */
  protected moveWithKeys(event: KeyboardEvent): void {
    const tabs = this.tabs();
    const current = tabs.findIndex((tab) => tab.id === this.active());
    const next = {
      ArrowRight: (current + 1) % tabs.length,
      ArrowLeft: (current - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    this.choose(tabs[next].id);
    this.tabButtons()[next]?.nativeElement.focus();
  }
}
