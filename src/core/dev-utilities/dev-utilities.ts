/** The Dev Utilities App's tabs, in order. */
export const devUtilitiesTabs = [
  { id: 'json', name: 'JSON' },
  { id: 'base64', name: 'Base64' },
  { id: 'jwt', name: 'JWT' },
  { id: 'uuid', name: 'UUID' },
  { id: 'timestamp', name: 'Timestamp' },
] as const;

export type DevUtilitiesTab = (typeof devUtilitiesTabs)[number]['id'];

/** The remembered tab if it is one that exists, otherwise the first. */
export function activeTab(remembered: string | undefined): DevUtilitiesTab {
  return devUtilitiesTabs.find((tab) => tab.id === remembered)?.id ?? devUtilitiesTabs[0].id;
}

/** How many UUIDs can be generated at once. */
const MAX_UUIDS = 100;

/** Generates `count` random (v4) UUIDs, at least 1 and at most 100. */
export function uuids(count: number): string[] {
  const clamped = Math.min(MAX_UUIDS, Math.max(1, Math.floor(count) || 1));
  return Array.from({ length: clamped }, () => crypto.randomUUID());
}
