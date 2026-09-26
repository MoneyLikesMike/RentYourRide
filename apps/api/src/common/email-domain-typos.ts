/**
 * Common consumer-email domain typos (BD / LC hygiene — RYRA-419).
 * Keep in sync with:
 *   - apps/web/src/auth/emailDomainTypos.ts
 *   - utils/emailDomainTypos.js
 */

/** Domains we treat as the intended destinations for typo correction. */
export const CANONICAL_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.ca',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
] as const;

/**
 * Exact typo → canonical. Keys are lowercase domains only.
 * Includes the HubSpot case `gmil.com` and other high-frequency fat-fingers.
 */
export const EMAIL_DOMAIN_TYPO_MAP: Record<string, string> = {
  'gmil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'gmailc.om': 'gmail.com',
  'gmaul.com': 'gmail.com',
  'hmail.com': 'gmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotamil.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'htmail.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlook.cm': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yahu.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'iclod.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'iclould.com': 'icloud.com',
  'icloud.co': 'icloud.com',
  'icloud.con': 'icloud.com',
  'icloud.cm': 'icloud.com',
};

export type EmailDomainTypoResult = {
  domain: string;
  suggestion: string;
  suggestedEmail: string;
};

function parseEmailParts(
  raw: string,
): { local: string; domain: string } | null {
  const email = String(raw || '')
    .trim()
    .toLowerCase();
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain || domain.includes(' ')) return null;
  return { local, domain };
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[b.length];
}

/** Closest canonical domain within edit distance 1–2, else null. */
function nearestCanonicalDomain(domain: string): string | null {
  if ((CANONICAL_EMAIL_DOMAINS as readonly string[]).includes(domain)) {
    return null;
  }
  let best: string | null = null;
  let bestDist = 3;
  for (const canon of CANONICAL_EMAIL_DOMAINS) {
    // Skip wildly different lengths (e.g. aol.com vs protonmail.com).
    if (Math.abs(canon.length - domain.length) > 2) continue;
    const d = levenshtein(domain, canon);
    if (d > 0 && d < bestDist) {
      bestDist = d;
      best = canon;
    }
  }
  return bestDist <= 2 ? best : null;
}

/**
 * If the email domain is a known typo (or very close to a major provider),
 * return the corrected full address. Otherwise null.
 */
export function findEmailDomainTypo(
  rawEmail: string,
): EmailDomainTypoResult | null {
  const parts = parseEmailParts(rawEmail);
  if (!parts) return null;
  const mapped = EMAIL_DOMAIN_TYPO_MAP[parts.domain];
  const suggestion = mapped || nearestCanonicalDomain(parts.domain);
  if (!suggestion || suggestion === parts.domain) return null;
  return {
    domain: parts.domain,
    suggestion,
    suggestedEmail: `${parts.local}@${suggestion}`,
  };
}

/** All typo domains we can filter in admin SQL. */
export function knownTypoDomains(): string[] {
  return Object.keys(EMAIL_DOMAIN_TYPO_MAP);
}

export function emailTypoUserMessage(rawEmail: string): string | null {
  const hit = findEmailDomainTypo(rawEmail);
  if (!hit) return null;
  return `Did you mean ${hit.suggestedEmail}? Check the email domain.`;
}
