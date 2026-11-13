import { FetchError, type Fetch } from '../core';

/** How long a request may take before it counts as failed. */
const TIMEOUT_MS = 10_000;

/**
 * The network, for the Weather Widget. Sends no cookies; a slow
 * or failed request rejects, and an unsuccessful one rejects with a `FetchError`.
 */
export function createNetworkFetch(): Fetch {
  return {
    async json(url, { method = 'GET', headers = {}, body } = {}) {
      const response = await globalThis.fetch(url, {
        method,
        headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'omit',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new FetchError(response.status, `${new URL(url).host} answered ${response.status}`);
      return response.json();
    },
  };
}
