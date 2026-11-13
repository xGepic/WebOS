import { ChangeDetectionStrategy, Component } from '@angular/core';
import { webSearchUrl } from '../../core';
import { openInBackgroundTab, openInThisTab } from '../../edges/tabs';

/**
 * The Search Widget: a search field across the Widget, one row high. Enter
 * searches DuckDuckGo in this tab, as the address bar would; ⌘/Ctrl+Enter
 * opens the results in a background tab and clears the field for the next
 * search. It has no Title Bar: the field explains itself. The field is a slim
 * bar centred in the Widget's row, not the whole row, which is taller than a
 * search field needs.
 */
@Component({
  selector: 'webos-search-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="material" role="search" (submit)="search(field, $event)">
      <svg class="icon" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" stroke-width="1.75" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
      </svg>
      <label class="visually-hidden" for="search-widget-field">Search DuckDuckGo</label>
      <input
        #field
        id="search-widget-field"
        class="field"
        type="search"
        placeholder="Search DuckDuckGo"
        autocomplete="off"
        spellcheck="false"
        enterkeyhint="search"
        (keydown.enter)="searchInBackground(field, $event)"
      />
    </form>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
    }
    form {
      display: flex;
      flex: 1;
      align-items: center;
      gap: 0.625rem;
      min-width: 0;
      height: 2.75rem;
      padding: 0 1rem;
      border-radius: var(--radius-widget);
    }
    .icon {
      flex: none;
      width: 1rem;
      height: 1rem;
      color: var(--text-secondary);
    }
    form:focus-within .icon {
      color: var(--text-primary);
    }
    /* The bar is the field's box: the input itself is borderless. */
    .field {
      flex: 1;
      min-width: 0;
      padding: 0;
      border: 0;
      outline: none;
      background: none;
      color: var(--text-primary);
      font: inherit;
      font-size: 0.9375rem;
    }
    .field::placeholder {
      color: var(--text-secondary);
    }
    .field::-webkit-search-cancel-button {
      filter: grayscale(1) brightness(1.6);
      cursor: pointer;
    }
    form:focus-within {
      outline: 2px solid var(--focus-ring);
      outline-offset: -2px;
    }
  `,
})
export class SearchWidget {
  /** Enter: the results in this tab. Nothing happens for an empty field. */
  protected search(field: HTMLInputElement, event: Event): void {
    event.preventDefault();
    if (field.value.trim()) openInThisTab(webSearchUrl(field.value));
  }

  /** ⌘/Ctrl+Enter: the results in a background tab, leaving the field empty for the next search. */
  protected searchInBackground(field: HTMLInputElement, event: Event): void {
    const keyboard = event as KeyboardEvent;
    if (!(keyboard.metaKey || keyboard.ctrlKey)) return;
    event.preventDefault();
    if (!field.value.trim()) return;
    void openInBackgroundTab(webSearchUrl(field.value));
    field.value = '';
  }
}
