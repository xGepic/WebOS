/**
 * Every App webOS has. Apps with `docked` have an icon in the Dock, in this
 * order: Notes, Clipboard, Dev Utilities, Settings. Countdowns and World Clock
 * don't: their Widgets open them. About webOS opens from the webOS mark in the
 * Menu Bar.
 */
export const apps = [
  { id: 'notes', name: 'Notes', docked: true },
  { id: 'countdowns', name: 'Countdowns', docked: false },
  { id: 'world-clock', name: 'World Clock', docked: false },
  { id: 'clipboard', name: 'Clipboard', docked: true },
  { id: 'dev-utilities', name: 'Dev Utilities', docked: true },
  { id: 'settings', name: 'Settings', docked: true },
  { id: 'about', name: 'About webOS', docked: false },
] as const;

export type AppId = (typeof apps)[number]['id'];
