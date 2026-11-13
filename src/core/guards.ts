/** Checks for values read from outside: stored documents, backups, and answers from the network. */

/** Whether `value` is a plain object (not null, not an array), whose fields can be read. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether `value` is a number that isn't NaN or infinite. */
export const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const isText = (value: unknown): value is string => typeof value === 'string';
