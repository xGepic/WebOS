/**
 * The Wallpapers: dark backgrounds that differ in the colour of the light
 * falling from the top centre. All dark, so every Widget reads the same on each.
 * The CSS paints them; the core only keeps which one is chosen.
 */

/** Every Wallpaper, in the order Settings offers them. The first is the default. */
export const wallpapers = [
  { id: 'midnight', name: 'Midnight' },
  { id: 'aurora', name: 'Aurora' },
  { id: 'ember', name: 'Ember' },
  { id: 'violet', name: 'Violet' },
  { id: 'graphite', name: 'Graphite' },
] as const;

export type Wallpaper = (typeof wallpapers)[number]['id'];

export const DEFAULT_WALLPAPER: Wallpaper = 'midnight';

export const isWallpaper = (value: unknown): value is Wallpaper => wallpapers.some((wallpaper) => wallpaper.id === value);

/** The stored choice, or the default for one this build doesn't know, such as a Wallpaper from a newer build. */
export const wallpaperOf = (stored: unknown): Wallpaper => (isWallpaper(stored) ? stored : DEFAULT_WALLPAPER);
