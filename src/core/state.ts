import type { Storage } from './edges';

/**
 * The single persisted state document. Later tickets add profile, Links,
 * Todos, Notes, Desktop layout and per-App state here, each with a migration.
 */
export interface StateDocument {
  schemaVersion: typeof SCHEMA_VERSION;
}

const SCHEMA_VERSION = 1;

type Migration = (document: Record<string, unknown>) => Record<string, unknown>;

/**
 * `migrations[n]` brings a version-n document to version n + 1.
 * Version 0 is any document written before documents carried a schema version.
 */
const migrations: Record<number, Migration> = {
  0: () => ({ schemaVersion: 1 }),
};

export class StateDocumentError extends Error {
  override readonly name = 'StateDocumentError';
}

function freshDocument(): StateDocument {
  return { schemaVersion: SCHEMA_VERSION };
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

/** Brings any older document forward to the current schema version, one step at a time. */
function migrate(document: unknown): StateDocument {
  let version = versionOf(document);
  let current = document as Record<string, unknown>;
  while (version < SCHEMA_VERSION) {
    current = migrations[version](current);
    version++;
  }
  return current as unknown as StateDocument;
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
  const document = migrate(stored);
  if (document !== stored) await storage.write(document);
  return document;
}
