/**
 * Every App webOS has. Apps with `docked` have an icon in the Dock, in this
 * order. Notes and Countdowns don't: their Widgets open them. The Launcher
 * finds every App.
 */
export const apps = [
  { id: 'notes', name: 'Notes', docked: false },
  { id: 'countdowns', name: 'Countdowns', docked: false },
  { id: 'dev-utilities', name: 'Dev Utilities', docked: true },
  { id: 'settings', name: 'Settings', docked: true },
] as const;

export type AppId = (typeof apps)[number]['id'];
