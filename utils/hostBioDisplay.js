/**
 * Host / profile cards show "Joined in {year}" from account created_at.
 * Strip conflicting tenure sentences from bios at display time only.
 */

const TENURE_PHRASE =
  '(?:on this app since|joined (?:in|on)|member since|hosting since|on rentyourride since)';

const TENURE_ONLY_LINE = new RegExp(
  `^\\s*${TENURE_PHRASE}\\b[^\\n]*$`,
  'gim',
);

const TENURE_SENTENCE = new RegExp(
  `(?:^|(?<=[.!?]\\s))[^.!?\\n]*\\b${TENURE_PHRASE}\\b[^.!?\\n]*(?:[.!?]+|$)`,
  'gi',
);

export function sanitizeHostBioForDisplay(bio) {
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
