import type { Storage } from '../core';

const KEY = 'webos';

/**
 * Stores the state document in the extension's local storage. Outside the
 * extension (`ng serve` in a normal tab) it falls back to `localStorage`.
 */
export function createExtensionStorage(): Storage {
  const local = globalThis.chrome?.storage?.local;
  if (!local) return createLocalStorageFallback();

  return {
    read: async () => (await local.get(KEY))[KEY],
    write: (document) => local.set({ [KEY]: document }),
  };
}

function createLocalStorageFallback(): Storage {
  return {
    read: async () => {
      const raw = localStorage.getItem(KEY);
      return raw === null ? undefined : JSON.parse(raw);
    },
    write: async (document) => localStorage.setItem(KEY, JSON.stringify(document)),
  };
}
