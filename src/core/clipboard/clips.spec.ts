import { createWebOS } from '../index';
import { createMemoryStorage, createTestClock, type TestClock } from '../testing';

const start = new Date(2026, 10, 12, 9, 0);
const MINUTE = 60_000;

async function webosAt(clock: TestClock = createTestClock(start), storage = createMemoryStorage()) {
  const webos = await createWebOS({ storage, clock });
  return { webos, clock, storage };
}

type WebOS = Awaited<ReturnType<typeof webosAt>>['webos'];

/** The Clips' texts in the order the Clipboard App lists them, pinned ones marked with a 📌. */
const shown = (webos: WebOS) =>
  webos.clips.list().map((clip) => (clip.pinned ? `📌 ${clip.text}` : clip.text));

/** The id of the Clip with `text`. */
function idOf(webos: WebOS, text: string): string {
  const clip = webos.clips.list().find((candidate) => candidate.text === text);
  if (!clip) throw new Error(`No Clip "${text}"`);
  return clip.id;
}

/** Saves each text in turn, a minute apart, so the last one is the newest. */
async function saveAll(webos: WebOS, clock: TestClock, texts: string[]) {
  for (const text of texts) {
    clock.advance(MINUTE);
    expect(await webos.clips.save(text)).toBe('saved');
  }
}

describe('saving Clips', () => {
  it('lists Clips newest first, saved exactly as pasted', async () => {
    const { webos, clock } = await webosAt();

    await saveAll(webos, clock, ['curl localhost:4200', '  indented\n  lines\n']);

    expect(shown(webos)).toEqual(['  indented\n  lines\n', 'curl localhost:4200']);
    expect(webos.clips.list()[0].savedAt).toBe(start.getTime() + 2 * MINUTE);
  });

  it.each([
    ['empty text', '', 'empty'],
    ['only whitespace', ' \n\t ', 'empty'],
    ['text over 100,000 characters', 'x'.repeat(100_001), 'too-long'],
  ])('refuses %s, saving nothing', async (_, text, reason) => {
    const { webos } = await webosAt();

    expect(await webos.clips.save(text)).toBe(reason);

    expect(webos.clips.list()).toEqual([]);
  });

  it('saves text of exactly 100,000 characters', async () => {
    const { webos } = await webosAt();

    expect(await webos.clips.save('x'.repeat(100_000))).toBe('saved');
  });

  it('moves a Clip pasted again to the top instead of adding a copy, keeping its pin', async () => {
    const { webos, clock } = await webosAt();
    await saveAll(webos, clock, ['a', 'b', 'c', 'pinned']);
    await webos.clips.setPinned(idOf(webos, 'b'), true);
    const id = idOf(webos, 'a');
    clock.advance(MINUTE);

    expect(await webos.clips.save('a')).toBe('moved');
    expect(await webos.clips.save('b')).toBe('moved');

    expect(shown(webos)).toEqual(['📌 b', 'a', 'pinned', 'c']);
    expect(idOf(webos, 'a')).toBe(id);
    expect(webos.clips.list()[1].savedAt).toBe(start.getTime() + 5 * MINUTE);
  });

  it('treats text differing only in whitespace as a different Clip', async () => {
    const { webos, clock } = await webosAt();
    await saveAll(webos, clock, ['a']);

    expect(await webos.clips.save('a\n')).toBe('saved');

    expect(shown(webos)).toEqual(['a\n', 'a']);
  });

  it('keeps the Clips in the next tab', async () => {
    const { webos, clock, storage } = await webosAt();
    await saveAll(webos, clock, ['a', 'b']);
    await webos.clips.setPinned(idOf(webos, 'a'), true);

    const { webos: nextTab } = await webosAt(clock, storage);

    expect(shown(nextTab)).toEqual(['📌 a', 'b']);
  });
});

describe('pinning and deleting Clips', () => {
  it('lists pinned Clips first, each group newest first, and unpinning puts a Clip back in its place', async () => {
    const { webos, clock } = await webosAt();
    await saveAll(webos, clock, ['a', 'b', 'c', 'd']);

    await webos.clips.setPinned(idOf(webos, 'a'), true);
    await webos.clips.setPinned(idOf(webos, 'c'), true);
    expect(shown(webos)).toEqual(['📌 c', '📌 a', 'd', 'b']);

    await webos.clips.setPinned(idOf(webos, 'c'), false);
    expect(shown(webos)).toEqual(['📌 a', 'd', 'c', 'b']);
  });

  it('deletes one Clip', async () => {
    const { webos, clock } = await webosAt();
    await saveAll(webos, clock, ['a', 'b']);

    await webos.clips.delete(idOf(webos, 'a'));

    expect(shown(webos)).toEqual(['b']);
  });

  it('clears every unpinned Clip, keeping the pinned ones', async () => {
    const { webos, clock } = await webosAt();
    await saveAll(webos, clock, ['a', 'b', 'c']);
    await webos.clips.setPinned(idOf(webos, 'b'), true);

    await webos.clips.clearUnpinned();

    expect(shown(webos)).toEqual(['📌 b']);
  });
});

describe('keeping Clips', () => {
  const numbered = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => `clip ${from + i}`);

  it('keeps the newest 50 unpinned Clips, dropping the oldest', async () => {
    const { webos, clock } = await webosAt();

    await saveAll(webos, clock, numbered(1, 52));

    expect(shown(webos)).toEqual(numbered(3, 52).reverse());
  });

  it("never drops a pinned Clip, and pinned Clips don't count toward the 50", async () => {
    const { webos, clock } = await webosAt();
    await saveAll(webos, clock, ['oldest']);
    await webos.clips.setPinned(idOf(webos, 'oldest'), true);

    await saveAll(webos, clock, numbered(1, 51));

    expect(shown(webos)).toEqual(['📌 oldest', ...numbered(2, 51).reverse()]);
  });
});

describe('when a Clip was saved', () => {
  it('shows the time today, then "Yesterday", then the date', async () => {
    const { webos, clock } = await webosAt();
    await saveAll(webos, clock, ['a']);

    expect(webos.clips.list()[0].saved).toBe('9:01 AM');
    clock.advance(24 * 60 * MINUTE);
    expect(webos.clips.list()[0].saved).toBe('Yesterday');
    clock.advance(24 * 60 * MINUTE);
    expect(webos.clips.list()[0].saved).toBe('Nov 12');
  });
});

describe('what a Clip can be opened in', () => {
  /** The kind the Clipboard App gives `text`. */
  async function kindOf(text: string) {
    const { webos } = await webosAt();
    await webos.clips.save(text);
    return webos.clips.list()[0].kind;
  }

  it.each([
    ['a JSON object', '{"user": {"id": 42}}', 'json'],
    ['a JSON array, with whitespace around it', '\n  [1, 2, 3]  \n', 'json'],
    ['a timestamp in seconds', '1700000000', 'timestamp'],
    ['a timestamp in milliseconds', '1700000000000', 'timestamp'],
    ['a 9-digit timestamp', '999999999', 'timestamp'],
    ['standard Base64 of text', 'aGVsbG8gd29ybGQ=', 'base64'],
    ['unpadded URL-safe Base64 of text', 'eyJhbGciOiJIUzI1NiJ9', 'base64'],
    ['Base64 split over lines', 'aGVsbG8g\nd29ybGQ=', 'base64'],
  ])('opens %s in its tab', async (_, text, kind) => {
    expect(await kindOf(text)).toBe(kind);
  });

  it.each([
    ['JSON that does not parse', '{"user": '],
    ['a JSON string, which is not an object or array', '"hello"'],
    ['a plain number that is too short for a timestamp', '12345678'],
    ['a number with 14 digits', '17000000000000'],
    ['a date', '2026-11-12'],
    ['an ordinary word that is valid Base64', 'password'],
    ['another such word', 'TestUser'],
    ['a UUID', '550e8400-e29b-41d4-a716-446655440000'],
    ['Base64 under 8 characters', 'aGk='],
    ['Base64 of binary data', 'AAECAwQFBgc='],
    ['a sentence', 'Remember to ship it'],
    ['a curl command', 'curl -s localhost:4200/api'],
  ])('offers nothing for %s', async (_, text) => {
    expect(await kindOf(text)).toBeUndefined();
  });
});
