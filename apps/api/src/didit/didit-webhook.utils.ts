import * as crypto from 'node:crypto';

/** Whole-number floats (1.0) -> integers (1), recursively. */
export function shortenFloats(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shortenFloats);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, shortenFloats(x)]),
    );
  }
  if (typeof v === 'number' && !Number.isInteger(v) && v % 1 === 0) return Math.trunc(v);
  return v;
}

/** Recursive lexicographic key sort (array order preserved). */
export function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.keys(v as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((v as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return v;
}

export function canonicalWebhookBody(parsed: unknown): string {
  return JSON.stringify(sortKeys(shortenFloats(parsed)));
}

export function verifyDiditWebhookSignature(
  parsed: unknown,
  signature: string,
  timestampSec: number,
  secret: string,
): boolean {
  if (!secret || !signature || !timestampSec) return false;
  if (Math.abs(Date.now() / 1000 - timestampSec) > 300) return false;

  const canonical = canonicalWebhookBody(parsed);
  const expected = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}