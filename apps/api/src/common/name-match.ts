/** Shown when card billing name does not match verified license identity. */
export const CARDHOLDER_LICENSE_NAME_MISMATCH_MESSAGE =
  'The name on your payment card must match the name on your verified driver\'s license. Update the cardholder name on your card or use a different payment method.';

export type IdentityNameParts = {
  firstName: string;
  lastName: string;
};

export function normalizePersonName(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function nameTokens(value: string): string[] {
  return normalizePersonName(value).split(' ').filter(Boolean);
}

function firstNamesMatch(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return false;
  const aFirst = ta[0];
  const bFirst = tb[0];
  if (aFirst === bFirst) return true;
  const longer = aFirst.length >= bFirst.length ? aFirst : bFirst;
  const shorter = aFirst.length < bFirst.length ? aFirst : bFirst;
  if (shorter.length >= 3 && longer.startsWith(shorter)) return true;
  return false;
}

function lastNameMatchesTokens(cardTokens: string[], licenseLast: string): boolean {
  const lastTokens = nameTokens(licenseLast);
  if (!lastTokens.length || !cardTokens.length) return false;
  for (const lastPart of lastTokens) {
    if (lastPart.length < 2) continue;
    const hit = cardTokens.some(
      (t) =>
        t === lastPart ||
        (lastPart.length >= 3 && (t.startsWith(lastPart) || lastPart.startsWith(t))),
    );
    if (hit) return true;
  }
  return false;
}

/**
 * Compare Stripe cardholder / billing name to verified identity (license or profile).
 * Allows middle names, reversed order, and common nickname prefixes (Kim/Kimberly).
 */
export function cardholderNameMatchesIdentity(
  cardholderName: string | null | undefined,
  identity: IdentityNameParts,
): boolean {
  const cardRaw = (cardholderName || '').trim();
  const idFirst = (identity.firstName || '').trim();
  const idLast = (identity.lastName || '').trim();
  if (!cardRaw || !idFirst || !idLast) return false;

  const cardTokens = nameTokens(cardRaw);
  if (!cardTokens.length) return false;

  const identityFull = normalizePersonName(`${idFirst} ${idLast}`);
  const cardNorm = normalizePersonName(cardRaw);
  if (cardNorm === identityFull) return true;

  if (cardTokens.length === 1) {
    return cardNorm === normalizePersonName(idFirst) || cardNorm === normalizePersonName(idLast);
  }

  const cardFirst = cardTokens[0];
  const cardLast = cardTokens[cardTokens.length - 1];

  if (firstNamesMatch(cardFirst, idFirst) && lastNameMatchesTokens(cardTokens, idLast)) {
    return true;
  }

  // "Last, First Middle" or reversed order
  if (firstNamesMatch(cardLast, idFirst) && lastNameMatchesTokens([cardTokens[0]], idLast)) {
    return true;
  }

  const idTokens = nameTokens(`${idFirst} ${idLast}`);
  if (
    idTokens.length >= 2 &&
    idTokens.every((it) =>
      cardTokens.some(
        (ct) => ct === it || (it.length >= 3 && (ct.startsWith(it) || it.startsWith(ct))),
      ),
    )
  ) {
    return true;
  }

  return false;
}
