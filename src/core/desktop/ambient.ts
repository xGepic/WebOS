/**
 * Ambient mode: after the Desktop has been left alone for a while, it fades to
 * a large clock over the Wallpaper. The core only keeps after how many minutes;
 * the Angular layer watches for the user and shows it.
 */

/** The minutes Settings offers, in order. */
export const ambientChoices = [1, 5, 15] as const;

export type AmbientAfter = (typeof ambientChoices)[number];

/** On, after five minutes, until changed in Settings. */
export const DEFAULT_AMBIENT_AFTER: AmbientAfter = 5;

export const isAmbientAfter = (value: unknown): value is AmbientAfter => ambientChoices.some((minutes) => minutes === value);

/** The stored choice: null for off, or the default for minutes this build doesn't offer, such as a newer build's. */
export const ambientAfterOf = (stored: unknown): AmbientAfter | null =>
  stored === null ? null : isAmbientAfter(stored) ? stored : DEFAULT_AMBIENT_AFTER;
