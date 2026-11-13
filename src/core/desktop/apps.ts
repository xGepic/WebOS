/**
 * Every App webOS has. Apps with `docked` have an icon in the Dock, in this
 * order: Clipboard, Dev Utilities, Settings. Notes, Countdowns and World Clock
 * don't: their Widgets open them.
 */
export const apps = [
  { id: 'notes', name: 'Notes', docked: false },
  { id: 'countdowns', name: 'Countdowns', docked: false },
  { id: 'world-clock', name: 'World Clock', docked: false },
  { id: 'clipboard', name: 'Clipboard', docked: true },
  { id: 'dev-utilities', name: 'Dev Utilities', docked: true },
  { id: 'settings', name: 'Settings', docked: true },
] as const;

export type AppId = (typeof apps)[number]['id'];
