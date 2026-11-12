import { decodeBase64 } from './base64';
import { formatDateTime } from './format';
import { formatJson } from './json';

const TIME_CLAIMS = [
  { claim: 'iat', label: 'Issued' },
  { claim: 'nbf', label: 'Not before' },
  { claim: 'exp', label: 'Expires' },
] as const;

/** One of a JWT's time claims: shown as a date, or why it can't be. */
export type JwtTime = (typeof TIME_CLAIMS)[number] &
  (
    | {
        ok: true;
        /** In local time, e.g. "Thu, Nov 12, 2026, 9:05:30 AM". */
        local: string;
        iso: string;
      }
    | { ok: false; error: string }
  );

/**
 * Whether the token's time claims allow it now: "not yet valid" before `nbf`,
 * "expired" from `exp` on, otherwise "valid". Undefined when it has neither
 * claim as a usable time.
 */
export type JwtValidity = 'valid' | 'expired' | 'not yet valid' | undefined;

export type JwtResult =
  | {
      ok: true;
      /** The header, pretty-printed. */
      header: string;
      /** The payload, pretty-printed. */
      payload: string;
      /** The time claims present, in the order a token lives through them. */
      times: JwtTime[];
      validity: JwtValidity;
    }
  | { ok: false; error: string };

/** The furthest a JavaScript Date reaches from 1970, either way. */
const MAX_DATE_MS = 8.64e15;

type Part = { ok: true; json: string; value: Record<string, unknown> } | { ok: false; error: string };

/** Decodes one Base64URL part of a token to a JSON object. */
function decodePart(encoded: string, name: 'header' | 'payload'): Part {
  const decoded = decodeBase64(encoded);
  if (!decoded.ok) return { ok: false, error: `The ${name} is not valid Base64URL.` };
  const json = formatJson(decoded.output);
  if (!json.ok) return { ok: false, error: `The ${name} is not JSON.` };
  const value: unknown = JSON.parse(decoded.output);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: `The ${name} is not a JSON object.` };
  }
  return { ok: true, json: json.output, value: value as Record<string, unknown> };
}

/**
 * Decodes a JWT's header and payload, and checks its time claims against `now`.
 * The signature is not verified: this only reads the token.
 */
export function decodeJwt(token: string, now: Date): JwtResult {
  const parts = token.trim().replace(/^Bearer\s+/i, '').split('.');
  if (parts.length !== 3) return { ok: false, error: 'A JWT has three parts separated by dots.' };

  const header = decodePart(parts[0], 'header');
  if (!header.ok) return header;
  const payload = decodePart(parts[1], 'payload');
  if (!payload.ok) return payload;

  const times = TIME_CLAIMS.flatMap((claim): JwtTime[] =>
    claim.claim in payload.value ? [timeOf(claim, payload.value[claim.claim])] : [],
  );
  const millisecondsOf = (claim: JwtTime['claim']) => {
    const time = times.find((candidate) => candidate.claim === claim);
    return time?.ok ? Date.parse(time.iso) : undefined;
  };

  return {
    ok: true,
    header: header.json,
    payload: payload.json,
    times,
    validity: validity(millisecondsOf('nbf'), millisecondsOf('exp'), now.getTime()),
  };
}

/** A time claim as a date, or why it can't be one. */
function timeOf(claim: (typeof TIME_CLAIMS)[number], value: unknown): JwtTime {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { ...claim, ok: false, error: 'Not a number of seconds.' };
  if (Math.abs(value * 1000) > MAX_DATE_MS) return { ...claim, ok: false, error: 'Too far from 1970 to be a date.' };
  const date = new Date(value * 1000);
  return { ...claim, ok: true, local: formatDateTime(date), iso: date.toISOString() };
}

function validity(notBefore: number | undefined, expires: number | undefined, now: number): JwtValidity {
  if (notBefore === undefined && expires === undefined) return undefined;
  if (notBefore !== undefined && now < notBefore) return 'not yet valid';
  if (expires !== undefined && now >= expires) return 'expired';
  return 'valid';
}
