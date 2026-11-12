/**
 * JSON for the Dev Utilities App: validation with the line and column of the
 * first error, pretty-printing and minifying.
 *
 * It parses by hand rather than with `JSON.parse`, for two reasons: engines
 * word and place their syntax errors differently, and parsing into JavaScript
 * values would change what it prints (`12345678901234567890` would lose
 * digits). Here every number and string is printed exactly as written.
 */

/** Where and why JSON is invalid. Line and column are 1-based. */
export interface JsonError {
  line: number;
  column: number;
  message: string;
}

export type JsonResult = { ok: true; output: string } | { ok: false; error: JsonError };

/** A parsed value. Numbers, strings and literals keep their source text. */
type JsonNode =
  | { kind: 'text'; source: string }
  | { kind: 'array'; items: JsonNode[] }
  | { kind: 'object'; entries: [key: string, value: JsonNode][] };

class JsonSyntaxError extends Error {
  constructor(
    readonly offset: number,
    message: string,
  ) {
    super(message);
  }
}

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const LITERALS = ['true', 'false', 'null'];
const ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);
/** Deeper than this is reported, rather than overflowing the parser's stack. */
const MAX_DEPTH = 1000;

function parse(text: string): JsonNode {
  let at = 0;

  const fail = (message: string, offset = at): never => {
    throw new JsonSyntaxError(offset, message);
  };
  const unexpected = (): never =>
    at >= text.length ? fail('Unexpected end of input') : fail(`Unexpected character ${JSON.stringify(text[at])}`);
  const skipWhitespace = () => {
    while (WHITESPACE.has(text[at])) at++;
  };
  const isDigit = (offset: number) => text[offset] >= '0' && text[offset] <= '9';

  function value(depth: number): JsonNode {
    skipWhitespace();
    const char = text[at];
    if ((char === '{' || char === '[') && depth >= MAX_DEPTH) fail(`Nested more than ${MAX_DEPTH} levels deep`);
    if (char === '{') return object(depth + 1);
    if (char === '[') return array(depth + 1);
    if (char === '"') return { kind: 'text', source: string() };
    if (char === '-' || isDigit(at)) return { kind: 'text', source: number() };
    const literal = LITERALS.find((word) => text.startsWith(word, at));
    if (literal) {
      at += literal.length;
      return { kind: 'text', source: literal };
    }
    return unexpected();
  }

  function object(depth: number): JsonNode {
    at++; // {
    const entries: [string, JsonNode][] = [];
    skipWhitespace();
    if (text[at] === '}') {
      at++;
      return { kind: 'object', entries };
    }
    for (;;) {
      skipWhitespace();
      if (text[at] !== '"') {
        if (at >= text.length) unexpected();
        fail('Expected a property name in double quotes');
      }
      const key = string();
      skipWhitespace();
      if (text[at] !== ':') {
        if (at >= text.length) unexpected();
        fail("Expected ':' after the property name");
      }
      at++;
      entries.push([key, value(depth)]);
      skipWhitespace();
      if (text[at] === ',') {
        at++;
      } else if (text[at] === '}') {
        at++;
        return { kind: 'object', entries };
      } else {
        if (at >= text.length) unexpected();
        fail("Expected ',' or '}'");
      }
    }
  }

  function array(depth: number): JsonNode {
    at++; // [
    const items: JsonNode[] = [];
    skipWhitespace();
    if (text[at] === ']') {
      at++;
      return { kind: 'array', items };
    }
    for (;;) {
      items.push(value(depth));
      skipWhitespace();
      if (text[at] === ',') {
        at++;
      } else if (text[at] === ']') {
        at++;
        return { kind: 'array', items };
      } else {
        if (at >= text.length) unexpected();
        fail("Expected ',' or ']'");
      }
    }
  }

  /** A string, returned with its quotes and escapes as written. */
  function string(): string {
    const from = at;
    at++; // "
    for (;;) {
      if (at >= text.length) fail('Unterminated string');
      const char = text[at];
      if (char === '"') {
        at++;
        return text.slice(from, at);
      }
      if (char < ' ') fail('Control characters must be escaped in a string');
      if (char === '\\') {
        const escape = text[at + 1];
        if (escape === undefined) fail('Unterminated string', text.length);
        if (escape === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(at + 2, at + 6))) fail('Invalid \\u escape');
          at += 6;
        } else if (ESCAPES.has(escape)) {
          at += 2;
        } else {
          fail('Invalid escape');
        }
      } else {
        at++;
      }
    }
  }

  /** A number, returned as written: -?(0|[1-9][0-9]*)(.[0-9]+)?([eE][+-]?[0-9]+)? */
  function number(): string {
    const from = at;
    if (text[at] === '-') at++;
    if (text[at] === '0') {
      at++;
      if (isDigit(at)) fail('Invalid number');
    } else if (isDigit(at)) {
      while (isDigit(at)) at++;
    } else {
      fail('Invalid number');
    }
    if (text[at] === '.') {
      at++;
      if (!isDigit(at)) fail('Invalid number');
      while (isDigit(at)) at++;
    }
    if (text[at] === 'e' || text[at] === 'E') {
      at++;
      if (text[at] === '+' || text[at] === '-') at++;
      if (!isDigit(at)) fail('Invalid number');
      while (isDigit(at)) at++;
    }
    return text.slice(from, at);
  }

  const root = value(0);
  skipWhitespace();
  if (at < text.length) fail('Unexpected text after the JSON value');
  return root;
}

function print(node: JsonNode, indent: string | undefined, depth = 0): string {
  if (node.kind === 'text') return node.source;
  const [open, close] = node.kind === 'array' ? ['[', ']'] : ['{', '}'];
  const parts =
    node.kind === 'array'
      ? node.items.map((item) => print(item, indent, depth + 1))
      : node.entries.map(([key, value]) => `${key}:${indent === undefined ? '' : ' '}${print(value, indent, depth + 1)}`);
  if (!parts.length) return open + close;
  if (indent === undefined) return open + parts.join(',') + close;
  const inner = '\n' + indent.repeat(depth + 1);
  return open + inner + parts.join(',' + inner) + '\n' + indent.repeat(depth) + close;
}

/** The 1-based line and column of an offset into `text`. */
function position(text: string, offset: number): { line: number; column: number } {
  const before = text.slice(0, offset).split('\n');
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

function transform(text: string, indent: string | undefined): JsonResult {
  try {
    return { ok: true, output: print(parse(text), indent) };
  } catch (error) {
    if (!(error instanceof JsonSyntaxError)) throw error;
    return { ok: false, error: { ...position(text, error.offset), message: error.message } };
  }
}

/** Validates JSON and pretty-prints it with two-space indentation. */
export function formatJson(text: string): JsonResult {
  return transform(text, '  ');
}

/** Validates JSON and prints it without any whitespace. */
export function minifyJson(text: string): JsonResult {
  return transform(text, undefined);
}
