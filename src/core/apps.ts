/** Every App webOS has, in Dock order. */
export const apps = [
  { id: 'notes', name: 'Notes' },
  { id: 'dev-utilities', name: 'Dev Utilities' },
  { id: 'settings', name: 'Settings' },
] as const;

export type AppId = (typeof apps)[number]['id'];
