import { Injectable } from '@angular/core';
import type { DevUtilitiesTab } from '../../../core';

/**
 * Text another App hands to a Dev Utilities tab, such as a Clip opened from
 * the Clipboard App. UI-only and never saved: the tab takes it once, as it is
 * created, and puts it in its input.
 */
@Injectable({ providedIn: 'root' })
export class DevUtilitiesHandoff {
  private pending: { tab: DevUtilitiesTab; text: string } | undefined;

  /** Leaves `text` for `tab`, replacing anything left before. */
  give(tab: DevUtilitiesTab, text: string): void {
    this.pending = { tab, text };
  }

  /** The text left for `tab`, if any. Taking it clears it, so it is used only once. */
  take(tab: DevUtilitiesTab): string | undefined {
    if (this.pending?.tab !== tab) return undefined;
    const { text } = this.pending;
    this.pending = undefined;
    return text;
  }
}
