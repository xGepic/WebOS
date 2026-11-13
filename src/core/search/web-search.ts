/** The DuckDuckGo results page for `query`, which the Search Widget opens. */
export function webSearchUrl(query: string): string {
  return `https://duckduckgo.com/?q=${encodeURIComponent(query.trim())}`;
}
