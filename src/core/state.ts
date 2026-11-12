import type { AppId } from './apps';
import type { Storage } from './edges';
import type { LinkGroup } from './links';
import type { Todo } from './todos';

/**
 * The single persisted state document. Later tickets add Notes and the
 * Desktop layout here, each with a migration.
 */
export interface StateDocument {
  schemaVersion: typeof SCHEMA_VERSION;
  profile: {
    /** As typed in Settings; the greeting trims it. Empty when not set. */
    name: string;
  };
  /**
   * What each App remembers between openings, such as the selected Note.
   * Each App adds its own fields here when it needs them.
   */
  apps: Partial<Record<AppId, Record<string, unknown>>>;
  /** Link Groups in display order, each holding its Links in display order. */
  linkGroups: LinkGroup[];
  /** The ids of the Docked Links, in Dock order. Independent of the Link Groups' order. */
  dockedLinkIds: string[];
  /** Every Todo, open and completed, in display order. */
  todos: Todo[];
}

const SCHEMA_VERSION = 5;

type Migration = (document: Record<string, unknown>) => Record<string, unknown>;

/**
 * `migrations[n]` brings a version-n document to version n + 1.
 * Version 0 is any document written before documents carried a schema version.
 * Each migration spells out its own values rather than reusing `freshDocument`,
 * because a migration must keep producing exactly that version forever.
 */
const migrations: Record<number, Migration> = {
  0: () => ({ schemaVersion: 1 }),
  1: (document) => ({ ...document, schemaVersion: 2, profile: { name: '' }, apps: {} }),
  2: (document) => ({ ...document, schemaVersion: 3, linkGroups: [] }),
  3: (document) => ({ ...document, schemaVersion: 4, dockedLinkIds: [] }),
  4: (document) => ({ ...document, schemaVersion: 5, todos: [] }),
};

export class StateDocumentError extends Error {
  override readonly name = 'StateDocumentError';
}

function freshDocument(): StateDocument {
  return { schemaVersion: SCHEMA_VERSION, profile: { name: '' }, apps: {}, linkGroups: [], dockedLinkIds: [], todos: [] };
}

function versionOf(document: unknown): number {
  if (typeof document !== 'object' || document === null || Array.isArray(document)) {
    throw new StateDocumentError('The stored state is not a webOS state document.');
  }
  const version = (document as { schemaVersion?: unknown }).schemaVersion;
  if (version === undefined) return 0;
  if (!Number.isInteger(version) || (version as number) < 0) {
    throw new StateDocumentError(`The stored state has an invalid schema version: ${String(version)}.`);
  }
  if ((version as number) > SCHEMA_VERSION) {
    throw new StateDocumentError(
      `The stored state comes from a newer webOS (schema version ${version}, this build knows ${SCHEMA_VERSION}).`,
    );
  }
  return version as number;
}

/** Throws unless `document` has the current schema's shape. */
function assertCurrentShape(document: Record<string, unknown>): asserts document is Record<string, unknown> & StateDocument {
  const profile = document['profile'] as { name?: unknown } | undefined;
  const apps = document['apps'];
  if (
    typeof profile?.name !== 'string' ||
    typeof apps !== 'object' ||
    apps === null ||
    Array.isArray(apps) ||
    !Array.isArray(document['linkGroups']) ||
    !Array.isArray(document['dockedLinkIds']) ||
    !Array.isArray(document['todos'])
  ) {
    throw new StateDocumentError('The stored state is damaged: part of it is missing.');
  }
}

/**
 * Brings any older document forward to the current schema version, one step
 * at a time, and checks the result. Throws a `StateDocumentError` if the
 * document can't be used.
 */
export function toCurrentDocument(document: unknown): StateDocument {
  let version = versionOf(document);
  let current = document as Record<string, unknown>;
  while (version < SCHEMA_VERSION) {
    current = migrations[version](current);
    version++;
  }
  assertCurrentShape(current);
  return current;
}

/**
 * Reads the document from storage, migrating it if needed. Throws without
 * writing if the stored document can't be used, so it is never overwritten.
 */
export async function loadState(storage: Storage): Promise<StateDocument> {
  const stored = await storage.read();
  if (stored === undefined) {
    const document = freshDocument();
    await storage.write(document);
    return document;
  }
  const document = toCurrentDocument(stored);
  if (document !== stored) await storage.write(document);
  return document;
}
