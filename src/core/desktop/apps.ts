/**
 * Every App webOS has. Apps with `docked` have an icon in the Dock, in this
 * order; Notes doesn't, because the Notes Widget opens it. The Launcher finds
 * every App.
 */
export const apps = [
  { id: 'notes', name: 'Notes', docked: false },
  { id: 'dev-utilities', name: 'Dev Utilities', docked: true },
  { id: 'settings', name: 'Settings', docked: true },
] as const;

export type AppId = (typeof apps)[number]['id'];
