/** Canadian SIN: 9 digits + Luhn check digit. */
export function normalizeSin(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

export function isValidCanadianSin(raw: string): boolean {
  const digits = normalizeSin(raw);
  if (!/^\d{9}$/.test(digits)) return false;
  // Reject obvious placeholders
  if (/^(\d)\1{8}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(digits[i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}
