/**
 * Keep in sync with apps/api/src/common/email-domain-typos.ts (RYRA-419).
 */

const CANONICAL_EMAIL_DOMAINS = [
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
];

const EMAIL_DOMAIN_TYPO_MAP = {
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

function parseEmailParts(raw) {
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

function levenshtein(a, b) {
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

function nearestCanonicalDomain(domain) {
  if (CANONICAL_EMAIL_DOMAINS.includes(domain)) return null;
  let best = null;
  let bestDist = 3;
  for (const canon of CANONICAL_EMAIL_DOMAINS) {
    if (Math.abs(canon.length - domain.length) > 2) continue;
    const d = levenshtein(domain, canon);
    if (d > 0 && d < bestDist) {
      bestDist = d;
      best = canon;
    }
  }
  return bestDist <= 2 ? best : null;
}

export function findEmailDomainTypo(rawEmail) {
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

export function emailTypoUserMessage(rawEmail) {
  const hit = findEmailDomainTypo(rawEmail);
  if (!hit) return null;
  return `Did you mean ${hit.suggestedEmail}? Check the email domain.`;
}
