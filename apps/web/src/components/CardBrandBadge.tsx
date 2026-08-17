/** Card network badge — Stripe card icons (matches Zeplin Visa badge). */

type Props = {
  brand?: string | null;
  className?: string;
};

function normalizeBrand(brand?: string | null): string {
  return String(brand || 'card').toLowerCase().replace(/\s+/g, '');
}

const BRAND_SRC: Record<string, string> = {
  visa: '/payments/visa.svg',
  mastercard: '/payments/mastercard.svg',
  master: '/payments/mastercard.svg',
  amex: '/payments/amex.svg',
  americanexpress: '/payments/amex.svg',
  discover: '/payments/discover.svg',
};

export default function CardBrandBadge({ brand, className }: Props) {
  const b = normalizeBrand(brand);
  const src = BRAND_SRC[b];
  const root = className
    ? `card-brand-badge ${className}`
    : 'card-brand-badge';

  if (src) {
    const label =
      b === 'mastercard' || b === 'master'
        ? 'Mastercard'
        : b === 'amex' || b === 'americanexpress'
          ? 'Amex'
          : b === 'discover'
            ? 'Discover'
            : 'Visa';
    return (
      <span className={`${root} card-brand-badge--icon`}>
        <img src={src} alt={label} className="card-brand-badge-img" />
      </span>
    );
  }

  const label = b === 'paypal' ? 'PAYPAL' : b.toUpperCase() || 'CARD';
  const tone = b === 'paypal' ? 'paypal' : 'other';

  return (
    <span className={`${root} card-brand-badge--pill card-brand-badge--${tone}`}>
      {label}
    </span>
  );
}
