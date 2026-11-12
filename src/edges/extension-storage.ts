import type { Storage } from '../core';

const KEY = 'webos';
/** Written alongside the document, so a tab can tell its own writes from other tabs'. */
const WRITER_KEY = 'webos-writer';

/**
 * Stores the state document in the extension's local storage. Outside the
 * extension (`ng serve` in a normal tab) it falls back to `localStorage`.
 */
export function createExtensionStorage(): Storage {
  const local = globalThis.chrome?.storage?.local;
  if (!local) return createLocalStorageFallback();

  const writer = crypto.randomUUID();
  return {
    read: async () => (await local.get(KEY))[KEY],
    write: (document) => local.set({ [KEY]: document, [WRITER_KEY]: { writer, at: Date.now() } }),
    onExternalChange(listener) {
      const handle = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
        if (area !== 'local' || !(KEY in changes)) return;
        const changedBy = (changes[WRITER_KEY]?.newValue as { writer?: string } | undefined)?.writer;
        if (changedBy !== writer) listener(changes[KEY].newValue);
      };
      chrome.storage.onChanged.addListener(handle);
      return () => chrome.storage.onChanged.removeListener(handle);
    },
  };
}

function createLocalStorageFallback(): Storage {
  return {
    read: async () => {
      const raw = localStorage.getItem(KEY);
      return raw === null ? undefined : JSON.parse(raw);
    },
    write: async (document) => localStorage.setItem(KEY, JSON.stringify(document)),
    onExternalChange(listener) {
      // The storage event only fires in other tabs.
      const handle = (event: StorageEvent) => {
        if (event.key === KEY && event.newValue !== null) listener(JSON.parse(event.newValue));
      };
      addEventListener('storage', handle);
      return () => removeEventListener('storage', handle);
    },
  };
}
