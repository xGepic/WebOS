/**
 * Dev Utilities › Diff: which lines of one text were removed and added to
 * make another, as a unified diff. Lines are matched with Myers' algorithm,
 * the one `git diff` uses by default. Within a changed line paired with its
 * replacement, the part that differs is marked.
 */

/** A run of a line's text, marked when it is the part that changed. */
export interface DiffPart {
  text: string;
  changed: boolean;
}

/** One row of the diff. Line numbers count from 1 in the text they belong to. */
export type DiffRow =
  | { kind: 'same'; before: number; after: number; parts: DiffPart[] }
  | { kind: 'removed'; before: number; parts: DiffPart[] }
  | { kind: 'added'; after: number; parts: DiffPart[] }
  /** Unchanged lines folded away, far from any change. */
  | { kind: 'skipped'; lines: number };

export type DiffResult =
  | {
      ok: true;
      /** Whether the texts have no differing lines (when whitespace is ignored, none beyond whitespace). */
      identical: boolean;
      added: number;
      removed: number;
      /** Empty when the texts are identical. */
      rows: DiffRow[];
    }
  | { ok: false; error: string };

export interface DiffOptions {
  /** Treat lines that differ only in spaces and tabs as the same. */
  ignoreWhitespace?: boolean;
}

/** Unchanged lines kept on each side of a change, as in `git diff`. */
const CONTEXT = 3;
/** Beyond this many removed and added lines, the texts are too different to be worth comparing line by line. */
export const MAX_EDITS = 2000;

type Op = { kind: 'same'; before: number; after: number } | { kind: 'removed'; before: number } | { kind: 'added'; after: number };

/** The lines removed from `before` and added to make `after`, or why they can't be compared. */
export function diffText(before: string, after: string, { ignoreWhitespace = false }: DiffOptions = {}): DiffResult {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  const key = ignoreWhitespace ? (line: string) => line.trim().replace(/\s+/g, ' ') : (line: string) => line;
  const ops = editScript(a.map(key), b.map(key));
  if (!ops) {
    return { ok: false, error: `These texts differ in more than ${MAX_EDITS.toLocaleString('en-US')} lines, too many to compare here.` };
  }

  const added = ops.filter((op) => op.kind === 'added').length;
  const removed = ops.filter((op) => op.kind === 'removed').length;
  if (!added && !removed) return { ok: true, identical: true, added, removed, rows: [] };

  const rows = toRows(ops, a, b);
  return { ok: true, identical: false, added, removed, rows: fold(rows) };
}

/**
 * Myers' shortest edit script from `a` to `b`. Each round `d` follows every
 * path with `d` edits as far down the matching diagonals as it goes, and keeps
 * a snapshot so the winning path can be traced back.
 */
function editScript(a: readonly string[], b: readonly string[]): Op[] | undefined {
  const n = a.length;
  const m = b.length;
  const limit = Math.min(n + m, MAX_EDITS);
  const offset = limit + 1;
  // v[offset + k] is how far along `a` the furthest path on diagonal k (x − y) has got.
  const v = new Int32Array(2 * limit + 3);
  const trace: Int32Array[] = [];

  for (let d = 0; d <= limit; d++) {
    // Diagonals −(d + 1) to d + 1, as they were before this round.
    trace.push(v.slice(offset - d - 1, offset + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) return traceBack(trace, n, m);
    }
  }
  return undefined;
}

function traceBack(trace: readonly Int32Array[], n: number, m: number): Op[] {
  const ops: Op[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const snapshot = trace[d];
    const at = (k: number) => snapshot[k + d + 1];
    const k = x - y;
    const previousK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const previousX = at(previousK);
    const previousY = previousX - previousK;
    while (x > previousX && y > previousY) {
      x--;
      y--;
      ops.push({ kind: 'same', before: x, after: y });
    }
    if (d > 0) ops.push(x === previousX ? { kind: 'added', after: y - 1 } : { kind: 'removed', before: x - 1 });
    x = previousX;
    y = previousY;
  }
  return ops.reverse();
}

/**
 * The rows for the edit script, each change listed as its removed lines and
 * then its added ones, as a unified diff shows them. The nth removed line of a
 * change is paired with its nth added line to mark what changed within it.
 */
function toRows(ops: readonly Op[], a: readonly string[], b: readonly string[]): DiffRow[] {
  const rows: DiffRow[] = [];
  let removed: number[] = [];
  let added: number[] = [];
  const flush = () => {
    const paired = removed.map((line, index) => (index < added.length ? marked(a[line], b[added[index]]) : undefined));
    removed.forEach((line, index) =>
      rows.push({ kind: 'removed', before: line + 1, parts: paired[index]?.before ?? plain(a[line]) }),
    );
    added.forEach((line, index) =>
      rows.push({ kind: 'added', after: line + 1, parts: paired[index]?.after ?? plain(b[line]) }),
    );
    removed = [];
    added = [];
  };
  for (const op of ops) {
    if (op.kind === 'removed') removed.push(op.before);
    else if (op.kind === 'added') added.push(op.after);
    else {
      flush();
      rows.push({ kind: 'same', before: op.before + 1, after: op.after + 1, parts: plain(b[op.after]) });
    }
  }
  flush();
  return rows;
}

const plain = (text: string): DiffPart[] => [{ text, changed: false }];

/**
 * A changed line and its replacement, each split into what they share at the
 * start and the end and the part between, which is what changed. Lines that
 * share nothing at either end are left unmarked: all of them changed.
 */
function marked(before: string, after: string): { before: DiffPart[]; after: DiffPart[] } | undefined {
  const shorter = Math.min(before.length, after.length);
  let start = 0;
  while (start < shorter && before[start] === after[start]) start++;
  let end = 0;
  while (end < shorter - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
  if (!start && !end) return undefined;
  const split = (text: string): DiffPart[] =>
    [
      { text: text.slice(0, start), changed: false },
      { text: text.slice(start, text.length - end), changed: true },
      { text: text.slice(text.length - end), changed: false },
    ].filter((part) => part.text);
  return { before: split(before), after: split(after) };
}

/** Folds each run of unchanged lines down to CONTEXT lines beside the changes around it. */
function fold(rows: readonly DiffRow[]): DiffRow[] {
  const folded: DiffRow[] = [];
  let index = 0;
  while (index < rows.length) {
    if (rows[index].kind !== 'same') {
      folded.push(rows[index++]);
      continue;
    }
    let end = index;
    while (end < rows.length && rows[end].kind === 'same') end++;
    const keepBefore = index === 0 ? 0 : CONTEXT;
    const keepAfter = end === rows.length ? 0 : CONTEXT;
    const hidden = end - index - keepBefore - keepAfter;
    // Folding a single line would take as much room as showing it.
    if (hidden > 1) {
      folded.push(...rows.slice(index, index + keepBefore), { kind: 'skipped', lines: hidden }, ...rows.slice(end - keepAfter, end));
    } else {
      folded.push(...rows.slice(index, end));
    }
    index = end;
  }
  return folded;
}
