import { createWebOS } from '../index';
import { createMemoryStorage, createTestClock } from '../testing';

const start = new Date(2026, 10, 12, 9, 0);

async function devUtilities(clock = createTestClock(start), storage = createMemoryStorage()) {
  return (await createWebOS({ storage, clock })).devUtilities;
}

describe('JSON', () => {
  it('pretty-prints valid JSON with two-space indentation', async () => {
    const tools = await devUtilities();

    expect(tools.formatJson('{"name":"webOS","tags":["dev",1,true,null],"empty":{},"none":[]}')).toEqual({
      ok: true,
      output: '{\n  "name": "webOS",\n  "tags": [\n    "dev",\n    1,\n    true,\n    null\n  ],\n  "empty": {},\n  "none": []\n}',
    });
  });

  it('minifies JSON', async () => {
    const tools = await devUtilities();

    expect(tools.minifyJson('{\n  "a": [ 1, 2 ],\n  "b": { "c": "d e" }\n}')).toEqual({ ok: true, output: '{"a":[1,2],"b":{"c":"d e"}}' });
  });

  it('keeps numbers and strings exactly as written, even beyond what JavaScript numbers hold', async () => {
    const tools = await devUtilities();

    expect(tools.minifyJson('{ "id": 12345678901234567890, "e": 1.50e+3, "s": "caf\\u00e9 \\"q\\"" }')).toEqual({
      ok: true,
      output: '{"id":12345678901234567890,"e":1.50e+3,"s":"caf\\u00e9 \\"q\\""}',
    });
  });

  it.each([
    ['a trailing comma', '{"a": 1,}', 1, 9, "Expected a property name in double quotes"],
    ['a missing comma', '{\n  "a": 1\n  "b": 2\n}', 3, 3, "Expected ',' or '}'"],
    ['single quotes', "['x']", 1, 2, `Unexpected character "'"`],
    ['an unclosed array', '[1, 2', 1, 6, 'Unexpected end of input'],
    ['an unterminated string', '{"a": "b}', 1, 10, 'Unterminated string'],
    ['a leading zero', '[01]', 1, 3, 'Invalid number'],
    ['text after the value', '{} {}', 1, 4, 'Unexpected text after the JSON value'],
    ['nothing at all', '   ', 1, 4, 'Unexpected end of input'],
    ['a backslash at the end', '"abc\\', 1, 6, 'Unterminated string'],
    ['a bad \\u escape', '"\\u12G4"', 1, 2, 'Invalid \\u escape'],
    ['an unknown escape', '"\\x"', 1, 2, 'Invalid escape'],
    ['a raw tab in a string', '"a\tb"', 1, 3, 'Control characters must be escaped in a string'],
    ['nesting too deep to read', '['.repeat(2000), 1, 1001, 'Nested more than 1000 levels deep'],
  ])('reports %s with its line and column', async (_, text, line, column, message) => {
    const tools = await devUtilities();

    expect(tools.formatJson(text)).toEqual({ ok: false, error: { line, column, message } });
  });
});

describe('Base64', () => {
  it('encodes text as UTF-8, so non-ASCII text round-trips', async () => {
    const tools = await devUtilities();

    expect(tools.encodeBase64('Grüße, 世界 🚀')).toBe('R3LDvMOfZSwg5LiW55WMIPCfmoA=');
    expect(tools.decodeBase64('R3LDvMOfZSwg5LiW55WMIPCfmoA=')).toEqual({ ok: true, output: 'Grüße, 世界 🚀' });
  });

  it('encodes URL-safe Base64: - and _ instead of + and /, without padding', async () => {
    const tools = await devUtilities();

    expect(tools.encodeBase64('<<???>>')).toBe('PDw/Pz8+Pg==');
    expect(tools.encodeBase64('<<???>>', { urlSafe: true })).toBe('PDw_Pz8-Pg');
  });

  it.each([
    ['standard', 'PDw/Pz8+Pg=='],
    ['URL-safe', 'PDw_Pz8-Pg'],
    ['URL-safe with padding', 'PDw_Pz8-Pg=='],
    ['standard without padding', 'PDw/Pz8+Pg'],
    ['wrapped across lines', 'PDw/\nPz8+\r\nPg=='],
  ])('decodes %s input', async (_, encoded) => {
    const tools = await devUtilities();

    expect(tools.decodeBase64(encoded)).toEqual({ ok: true, output: '<<???>>' });
  });

  it.each([
    ['a character outside Base64', 'abc!', 'Not Base64: "!" is not a Base64 character.'],
    ['an impossible length', 'abcde', 'Not Base64: the length is wrong.'],
    ['misplaced padding', 'ab=c', 'Not Base64: "=" padding can only come at the end.'],
    ['bytes that are not UTF-8 text', '//4A', 'This decodes to binary data, not UTF-8 text.'],
  ])('refuses %s', async (_, encoded, error) => {
    const tools = await devUtilities();

    expect(tools.decodeBase64(encoded)).toEqual({ ok: false, error });
  });
});

describe('Diff', () => {
  const lines = (count: number, line: (n: number) => string) => Array.from({ length: count }, (_, i) => line(i + 1)).join('\n');

  it('says when the texts are identical', async () => {
    const tools = await devUtilities();

    expect(tools.diffText('a\nb', 'a\nb')).toEqual({ ok: true, identical: true, added: 0, removed: 0, rows: [] });
  });

  it('lists removed and added lines with their line numbers, between the unchanged ones', async () => {
    const tools = await devUtilities();

    const result = tools.diffText('a\nb\nc', 'a\nB\nc\nd');

    expect(result).toMatchObject({ ok: true, identical: false, added: 2, removed: 1 });
    expect(result.ok && result.rows.map((row) => (row.kind === 'skipped' ? row : { ...row, parts: row.parts.map((p) => p.text).join('') }))).toEqual([
      { kind: 'same', before: 1, after: 1, parts: 'a' },
      { kind: 'removed', before: 2, parts: 'b' },
      { kind: 'added', after: 2, parts: 'B' },
      { kind: 'same', before: 3, after: 3, parts: 'c' },
      { kind: 'added', after: 4, parts: 'd' },
    ]);
  });

  it('marks the part of a changed line that differs from its replacement', async () => {
    const tools = await devUtilities();

    const result = tools.diffText('const port = 4200;', 'const port = 4300;');

    expect(result.ok && result.rows).toEqual([
      { kind: 'removed', before: 1, parts: [{ text: 'const port = 4', changed: false }, { text: '2', changed: true }, { text: '00;', changed: false }] },
      { kind: 'added', after: 1, parts: [{ text: 'const port = 4', changed: false }, { text: '3', changed: true }, { text: '00;', changed: false }] },
    ]);
  });

  it('leaves a line unmarked when it shares nothing with its replacement', async () => {
    const tools = await devUtilities();

    const result = tools.diffText('apple', 'zebra');

    expect(result.ok && result.rows.map((row) => row.kind !== 'skipped' && row.parts)).toEqual([
      [{ text: 'apple', changed: false }],
      [{ text: 'zebra', changed: false }],
    ]);
  });

  it('folds unchanged lines down to three beside each change', async () => {
    const tools = await devUtilities();
    const before = lines(20, (n) => `line ${n}`);

    const result = tools.diffText(before, before.replace('line 10', 'line ten'));

    expect(result.ok && result.rows.map((row) => (row.kind === 'skipped' ? `… ${row.lines}` : `${row.kind} ${row.kind === 'added' ? row.after : row.before}`))).toEqual([
      '… 6',
      'same 7',
      'same 8',
      'same 9',
      'removed 10',
      'added 10',
      'same 11',
      'same 12',
      'same 13',
      '… 7',
    ]);
  });

  it('shows a single unchanged line between changes rather than folding it', async () => {
    const tools = await devUtilities();
    const before = lines(7, (n) => `line ${n}`);

    const result = tools.diffText(before, before.replace('line 1', 'one').replace('line 7', 'seven'));

    expect(result.ok && result.rows.some((row) => row.kind === 'skipped')).toBe(false);
  });

  it('can ignore differences in whitespace, and never counts Windows line endings as one', async () => {
    const tools = await devUtilities();

    expect(tools.diffText('  a\nb', 'a\nb  ')).toMatchObject({ identical: false });
    expect(tools.diffText('  a\nb', 'a\nb  ', { ignoreWhitespace: true })).toMatchObject({ identical: true });
    expect(tools.diffText('a\r\nb', 'a\nb')).toMatchObject({ identical: true });
  });

  it('refuses texts that differ in more than 2,000 lines', async () => {
    const tools = await devUtilities();

    expect(tools.diffText(lines(1000, (n) => `a${n}`), lines(1000, (n) => `b${n}`))).toEqual({ ok: true, identical: false, added: 1000, removed: 1000, rows: expect.any(Array) });
    expect(tools.diffText(lines(1001, (n) => `a${n}`), lines(1001, (n) => `b${n}`))).toEqual({
      ok: false,
      error: 'These texts differ in more than 2,000 lines, too many to compare here.',
    });
  });
});

describe('UUID', () => {
  const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('generates as many distinct v4 UUIDs as asked for', async () => {
    const tools = await devUtilities();

    const uuids = tools.uuids(5);

    expect(uuids).toHaveLength(5);
    expect(new Set(uuids).size).toBe(5);
    uuids.forEach((uuid) => expect(uuid).toMatch(V4));
  });

  it('generates between 1 and 100 at a time', async () => {
    const tools = await devUtilities();

    expect(tools.uuids(0)).toHaveLength(1);
    expect(tools.uuids(1000)).toHaveLength(100);
  });
});

describe('Timestamp', () => {
  it('reads a 10-digit timestamp as seconds', async () => {
    const tools = await devUtilities();

    expect(tools.convertTime(' 1700000000 ')).toMatchObject({
      ok: true,
      unit: 'seconds',
      seconds: '1700000000',
      milliseconds: '1700000000000',
      iso: '2023-11-14T22:13:20.000Z',
    });
  });

  it('reads a 13-digit timestamp as milliseconds', async () => {
    const tools = await devUtilities();

    expect(tools.convertTime('1700000000123')).toMatchObject({
      ok: true,
      unit: 'milliseconds',
      seconds: '1700000000',
      milliseconds: '1700000000123',
      iso: '2023-11-14T22:13:20.123Z',
    });
  });

  it('switches from seconds to milliseconds at 100,000,000,000 (the year 5138 in seconds, 1973 in milliseconds)', async () => {
    const tools = await devUtilities();

    expect(tools.convertTime('99999999999')).toMatchObject({ unit: 'seconds' });
    expect(tools.convertTime('100000000000')).toMatchObject({ unit: 'milliseconds' });
  });

  it('shows the timestamp in local time', async () => {
    const tools = await devUtilities();

    expect(tools.convertTime(String(start.getTime() / 1000))).toMatchObject({ local: 'Thu, Nov 12, 2026, 9:00:00 AM' });
  });

  it.each([
    ['an ISO date in UTC', '2023-11-14T22:13:20Z'],
    ['an ISO date with an offset', '2023-11-14T23:13:20+01:00'],
    ['an ISO date with milliseconds', '2023-11-14T22:13:20.000Z'],
  ])('converts %s back to a timestamp', async (_, date) => {
    const tools = await devUtilities();

    expect(tools.convertTime(date)).toMatchObject({ ok: true, seconds: '1700000000', iso: '2023-11-14T22:13:20.000Z' });
  });

  it('reads a date without an offset as local time', async () => {
    const tools = await devUtilities();

    expect(tools.convertTime('2026-11-12 09:00')).toMatchObject({ ok: true, milliseconds: String(start.getTime()) });
    expect(tools.convertTime('2026-11-12T09:00:00')).toMatchObject({ ok: true, milliseconds: String(start.getTime()) });
    expect(tools.convertTime('2026-11-12')).toMatchObject({ ok: true, milliseconds: String(new Date(2026, 10, 12).getTime()) });
  });

  it('reads the local form back, so it round-trips too', async () => {
    const tools = await devUtilities();
    const there = tools.convertTime('1700000000');

    const back = there.ok ? tools.convertTime(there.local) : there;

    expect(tools.convertTime('Thu, Nov 12, 2026, 9:00:00 AM')).toMatchObject({ ok: true, milliseconds: String(start.getTime()) });
    expect(tools.convertTime('Nov 12, 2026, 9:00 PM')).toMatchObject({ ok: true, milliseconds: String(start.getTime() + 12 * 3600_000) });
    expect(back).toMatchObject({ ok: true, seconds: '1700000000' });
  });

  it('shows the same millisecond everywhere for a fractional timestamp', async () => {
    const tools = await devUtilities();

    expect(tools.convertTime('1.0009')).toMatchObject({ ok: true, milliseconds: '1000', iso: '1970-01-01T00:00:01.000Z' });
  });

  it('round-trips a timestamp through its ISO date', async () => {
    const tools = await devUtilities();
    const there = tools.convertTime('1700000000123');

    const back = there.ok ? tools.convertTime(there.iso) : there;

    expect(back).toMatchObject({ ok: true, milliseconds: '1700000000123' });
  });

  it('converts whichever was typed into the one field: a timestamp or a date', async () => {
    const tools = await devUtilities();

    expect(tools.convertTime('1700000000')).toMatchObject({ ok: true, unit: 'seconds', iso: '2023-11-14T22:13:20.000Z' });
    expect(tools.convertTime('2023-11-14T22:13:20Z')).toMatchObject({ ok: true, seconds: '1700000000' });
    expect(tools.convertTime('soon')).toEqual({
      ok: false,
      error: 'Enter a Unix timestamp like 1700000000, or a date like 2026-11-12 09:30 or 2026-11-12T08:30:00Z.',
    });
  });

  it('gives the current time for the "now" button', async () => {
    const clock = createTestClock(start);
    const tools = await devUtilities(clock);
    clock.advance(30_000);

    expect(tools.now()).toMatchObject({ ok: true, seconds: String(start.getTime() / 1000 + 30) });
  });

  it.each([
    ['words', 'yesterday'],
    ['an impossible month', '2026-13-01'],
    ['an impossible day', '2026-02-30'],
    ['a number too large for a date', '99999999999999999'],
    ['something that is not a number', '17e'],
    ['an offset beyond 23:59', '2023-11-14T22:13:20+24:00'],
  ])('refuses %s', async (_, input) => {
    const tools = await devUtilities();

    expect(tools.convertTime(input)).toMatchObject({ ok: false, error: expect.any(String) });
  });
});

describe('the active Dev Utilities tab', () => {
  it('starts on JSON, and is remembered for the next opening in any tab', async () => {
    const storage = createMemoryStorage();
    const tools = await devUtilities(createTestClock(start), storage);
    expect(tools.activeTab()).toBe('json');

    await tools.setActiveTab('diff');
    const nextTab = await devUtilities(createTestClock(start), storage);

    expect(tools.activeTab()).toBe('diff');
    expect(nextTab.activeTab()).toBe('diff');
  });

  it('starts on JSON when the remembered tab no longer exists, like the JWT tab Diff replaced', async () => {
    const tools = await devUtilities(createTestClock(start), createMemoryStorage({ apps: { 'dev-utilities': { activeTab: 'jwt' } } }));

    expect(tools.activeTab()).toBe('json');
  });
});
