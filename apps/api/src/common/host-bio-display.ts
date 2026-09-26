/**
 * Host cards show "Joined in {year}" from users.created_at.
 * Migrated bios sometimes still include a second tenure claim
 * ("On this app since 2018"). Strip those at projection/display time only —
 * never rewrite stored about_bio values.
 */

const TENURE_PHRASE =
  '(?:on this app since|joined (?:in|on)|member since|hosting since|on rentyourride since)';

/** Whole line that is essentially just a tenure claim. */
const TENURE_ONLY_LINE = new RegExp(
  `^\\s*${TENURE_PHRASE}\\b[^\\n]*$`,
  'gim',
);

/** Tenure claim as its own sentence inside a paragraph. */
const TENURE_SENTENCE = new RegExp(
  `(?:^|(?<=[.!?]\\s))[^.!?\\n]*\\b${TENURE_PHRASE}\\b[^.!?\\n]*(?:[.!?]+|$)`,
  'gi',
);

export function sanitizeHostBioForDisplay(
  bio: string | null | undefined,
): string {
  const raw = (bio ?? '').trim();
  if (!raw) return '';

  let next = raw.replace(TENURE_ONLY_LINE, '');
  next = next.replace(TENURE_SENTENCE, '');
  return next
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .replace(/^[.\s]+/, '')
    .trim();
}
