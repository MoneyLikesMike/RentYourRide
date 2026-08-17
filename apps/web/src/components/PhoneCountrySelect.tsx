import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  COUNTRY_CALLING_CODES,
  type CountryCallingCode,
} from '../data/countryCallingCodes';
import { countryCodeToEmoji } from '../utils/phoneFormat';

type Props = {
  countryCode: string;
  callingCode: string;
  onChange: (country: CountryCallingCode) => void;
};

function findByCca2(cca2: string): CountryCallingCode | undefined {
  return COUNTRY_CALLING_CODES.find((c) => c.cca2 === cca2);
}

/** Match stored E.164 (+1…) to the best country entry (prefer CA for +1). */
export function detectCountryFromE164(
  e164: string | null | undefined,
): CountryCallingCode {
  const digits = String(e164 || '').replace(/\D/g, '');
  if (!digits) return findByCca2('CA')!;

  const preferred = ['CA', 'US'];
  const matches = COUNTRY_CALLING_CODES.filter((c) =>
    digits.startsWith(c.callingCode),
  ).sort((a, b) => b.callingCode.length - a.callingCode.length);

  if (!matches.length) return findByCca2('CA')!;

  const bestLen = matches[0].callingCode.length;
  const sameLen = matches.filter((c) => c.callingCode.length === bestLen);
  const preferredHit = preferred
    .map((code) => sameLen.find((c) => c.cca2 === code))
    .find(Boolean);
  return preferredHit || sameLen[0];
}

/** National digits only from an E.164 value for the selected calling code. */
export function nationalFromE164(
  e164: string | null | undefined,
  callingCode: string,
): string {
  const digits = String(e164 || '').replace(/\D/g, '');
  const code = callingCode.replace(/\D/g, '');
  if (code && digits.startsWith(code)) return digits.slice(code.length);
  return digits;
}

export default function PhoneCountrySelect({
  countryCode,
  callingCode,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_CALLING_CODES;
    return COUNTRY_CALLING_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.cca2.toLowerCase().includes(q) ||
        c.callingCode.includes(q.replace(/^\+/, '')) ||
        `+${c.callingCode}`.includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="phone-country" ref={rootRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        className="phone-country-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select country code"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="phone-country-flag" aria-hidden>
          {countryCodeToEmoji(countryCode)}
        </span>
        <span className="phone-country-code">+{callingCode}</span>
        <span className="phone-country-chevron" aria-hidden />
      </button>

      {open ? (
        <div className="phone-country-panel" role="listbox">
          <input
            ref={searchRef}
            className="phone-country-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country"
            aria-label="Search country"
          />
          <ul className="phone-country-list">
            {filtered.map((c) => (
              <li key={c.cca2}>
                <button
                  type="button"
                  className={
                    c.cca2 === countryCode
                      ? 'phone-country-option phone-country-option--active'
                      : 'phone-country-option'
                  }
                  role="option"
                  aria-selected={c.cca2 === countryCode}
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span className="phone-country-flag" aria-hidden>
                    {countryCodeToEmoji(c.cca2)}
                  </span>
                  <span className="phone-country-name">{c.name}</span>
                  <span className="phone-country-dial">+{c.callingCode}</span>
                </button>
              </li>
            ))}
            {!filtered.length ? (
              <li className="phone-country-empty">No countries found</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
