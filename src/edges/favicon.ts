/**
 * The browser's cached favicon for a page, through the extension `favicon`
 * permission. Undefined outside the extension (`ng serve`), where callers show
 * a fallback instead.
 */
export function faviconUrl(pageUrl: string, size = 32): string | undefined {
  const runtime = globalThis.chrome?.runtime;
  if (!runtime?.id) return undefined;
  const url = new URL(runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', String(size));
  return url.toString();
}
