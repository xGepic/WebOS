/** Base64 for the Dev Utilities App. Text is always encoded as UTF-8. */

export type Base64Result = { ok: true; output: string } | { ok: false; error: string };

const BASE64_CHARACTER = /[A-Za-z0-9+/\-_=]/;

/** Bytes as a "binary string", one character per byte, which is what `btoa` takes. */
function toBinaryString(bytes: Uint8Array): string {
  let binary = '';
  // In chunks, so that a long text doesn't exceed the engine's argument limit.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return binary;
}

/** Encodes text as UTF-8 Base64. URL-safe Base64 uses - and _ instead of + and /, and leaves out the padding. */
export function encodeBase64(text: string, { urlSafe = false }: { urlSafe?: boolean } = {}): string {
  const encoded = btoa(toBinaryString(new TextEncoder().encode(text)));
  return urlSafe ? encoded.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '') : encoded;
}

/**
 * Decodes Base64 to UTF-8 text. Standard and URL-safe Base64 are both
 * accepted, with or without padding, and line breaks are ignored.
 */
export function decodeBase64(encoded: string): Base64Result {
  const compact = encoded.replace(/\s+/g, '');
  const stray = [...compact].find((char) => !BASE64_CHARACTER.test(char));
  if (stray) return { ok: false, error: `Not Base64: ${JSON.stringify(stray)} is not a Base64 character.` };

  const unpadded = compact.replace(/={1,2}$/, '');
  if (unpadded.includes('=')) return { ok: false, error: 'Not Base64: "=" padding can only come at the end.' };
  if (unpadded.length % 4 === 1) return { ok: false, error: 'Not Base64: the length is wrong.' };

  const standard = unpadded.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(standard.padEnd(Math.ceil(standard.length / 4) * 4, '='));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  try {
    return { ok: true, output: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, error: 'This decodes to binary data, not UTF-8 text.' };
  }
}
