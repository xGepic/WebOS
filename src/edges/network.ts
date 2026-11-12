import type { Fetch } from '../core';

/** How long a request may take before it counts as failed. */
const TIMEOUT_MS = 10_000;

/** The network, for the Weather Widget. Sends no cookies; a slow, failed or unsuccessful request rejects. */
export function createNetworkFetch(): Fetch {
  return {
    async json(url) {
      const response = await globalThis.fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) throw new Error(`${url} answered ${response.status}`);
      return response.json();
    },
  };
}
