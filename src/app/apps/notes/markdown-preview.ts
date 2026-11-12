import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { renderMarkdown } from './markdown';

/**
 * A Note's Markdown, rendered. The HTML is sanitised by `renderMarkdown`
 * (DOMPurify) before Angular is told to trust it.
 *
 * The rendered elements are created outside Angular's templates, so they don't
 * get its scoping attributes: the styles are global and every selector starts
 * with this component's tag instead.
 */
@Component({
  selector: 'webos-markdown-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[innerHTML]': 'html()' },
  template: '',
  styles: `
    webos-markdown-preview {
      display: block;
      font-size: 0.9375rem;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }
    webos-markdown-preview > :first-child {
      margin-top: 0;
    }
    webos-markdown-preview :is(h1, h2, h3, h4, h5, h6) {
      margin: 1.4em 0 0.5em;
      line-height: 1.2;
      font-weight: 650;
    }
    webos-markdown-preview h1 {
      font-size: 1.6rem;
      letter-spacing: var(--tracking-display);
    }
    webos-markdown-preview h2 {
      font-size: 1.25rem;
      letter-spacing: var(--tracking-title);
    }
    webos-markdown-preview h3 {
      font-size: 1.05rem;
    }
    webos-markdown-preview :is(p, ul, ol, pre, blockquote, table) {
      margin: 0 0 0.9em;
    }
    webos-markdown-preview :is(ul, ol) {
      padding-left: 1.4em;
    }
    webos-markdown-preview a {
      color: var(--accent);
    }
    webos-markdown-preview code {
      padding: 0.1em 0.35em;
      border-radius: var(--radius-inline);
      background: var(--control-fill);
      font-family: var(--font-mono);
      font-size: 0.85em;
    }
    webos-markdown-preview pre {
      overflow-x: auto;
      padding: 0.75rem 0.875rem;
      border-radius: var(--radius-control);
      background: var(--control-fill);
    }
    webos-markdown-preview pre code {
      padding: 0;
      background: none;
    }
    webos-markdown-preview blockquote {
      padding-left: 0.875rem;
      border-left: 3px solid var(--material-border);
      color: var(--text-secondary);
    }
    webos-markdown-preview hr {
      border: 0;
      border-top: 1px solid var(--material-border);
    }
    webos-markdown-preview img {
      max-width: 100%;
    }
    webos-markdown-preview table {
      border-collapse: collapse;
    }
    webos-markdown-preview :is(th, td) {
      padding: 0.3rem 0.6rem;
      border: 1px solid var(--material-border);
    }
  `,
})
export class MarkdownPreview {
  readonly markdown = input.required<string>();
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly html = computed(() => this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(this.markdown())));
}
