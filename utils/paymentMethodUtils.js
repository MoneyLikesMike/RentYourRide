/** Detect card network from PAN digits (client-side heuristic). */
export function detectCardBrand(digits) {
  const d = String(digits).replace(/\D/g, '');
  if (!d) return 'other';
  if (/^4/.test(d)) return 'visa';
  if (/^5[1-5]/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  if (/^6(?:011|5)/.test(d)) return 'discover';
  return 'other';
}

export function brandLabel(brand) {
  switch (brand) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'amex':
      return 'Amex';
    case 'discover':
      return 'Discover';
    default:
      return 'Card';
  }
}
