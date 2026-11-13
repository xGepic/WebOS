import { webSearchUrl } from '../index';

describe('web search', () => {
  it('searches DuckDuckGo for what was typed, without the spaces around it', () => {
    expect(webSearchUrl('  angular signals ')).toBe('https://duckduckgo.com/?q=angular%20signals');
  });

  it('searches for exactly what was typed, symbols included', () => {
    expect(webSearchUrl('c++ & rust?')).toBe('https://duckduckgo.com/?q=c%2B%2B%20%26%20rust%3F');
  });
});
