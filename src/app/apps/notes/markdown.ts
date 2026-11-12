import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Renders a Note's Markdown (GitHub-flavoured) to HTML that is safe to show:
 * DOMPurify removes scripts, event handlers and `javascript:` URLs, so a Note
 * can never run code in webOS. Styles are removed too, so a Note can't restyle
 * or cover the page around its preview.
 */
export function renderMarkdown(markdown: string): string {
  return DOMPurify.sanitize(marked.parse(markdown, { async: false, gfm: true }), {
    FORBID_TAGS: ['style'],
    FORBID_ATTR: ['style'],
  });
}
