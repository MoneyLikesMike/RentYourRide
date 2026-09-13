import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../api/http';
import type { ParsedPlace } from '../api/maps';
import { submitPayoutSetup } from '../api/payouts';
import { getMe } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { regionsForCountry } from '../data/regions';
import PlacesAutocomplete from './PlacesAutocomplete';

type Country = 'CA' | 'US';

type Props = {
  /** Where Stripe should send the host back to if it still needs something. */
  returnPath: string;
  onComplete: () => void;
};

type Fields = {
  firstName: string;
  lastName: string;
  email: string;
  dob: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: Country;
  region: string;
  postalCode: string;
  phone: string;
  businessDescription: string;
  currency: 'CAD' | 'USD';
  bankCountry: Country;
  transitNumber: string;
  institutionNumber: string;
  routingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
};

const EMPTY: Fields = {
  firstName: '',
  lastName: '',
  email: '',
  dob: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  country: 'CA',
  region: '',
  postalCode: '',
  phone: '',
  businessDescription: '',
  currency: 'CAD',
  bankCountry: 'CA',
  transitNumber: '',
  institutionNumber: '',
  routingNumber: '',
  accountNumber: '',
  confirmAccountNumber: '',
};

const digits = (value: string) => value.replace(/\D/g, '');

function formatDob(value: string): string {
  const d = digits(value).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)} / ${d.slice(2)}`;
  return `${d.slice(0, 2)} / ${d.slice(2, 4)} / ${d.slice(4)}`;
}

function formatPhone(value: string): string {
  const d = digits(value).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function formatPostal(value: string, country: Country): string {
  if (country === 'US') {
    const d = digits(value).slice(0, 9);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }
  const cleaned = value
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6);
  return cleaned.length > 3
    ? `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
    : cleaned;
}

/** Google returns country names, but the rest of the form works in codes. */
function countryFromPlace(name: string): Country | null {
  const n = name.trim().toLowerCase();
  if (n === 'canada') return 'CA';
  if (['united states', 'usa', 'united states of america'].includes(n)) {
    return 'US';
  }
  return null;
}

/** "MM / DD / YYYY" -> "YYYY-MM-DD", or null when the date isn't real. */
function dobToIso(value: string): string | null {
  const d = digits(value);
  if (d.length !== 8) return null;
  const month = Number(d.slice(0, 2));
  const day = Number(d.slice(2, 4));
  const year = Number(d.slice(4, 8));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (age < 18 || age > 120) return null;
  return `${d.slice(4, 8)}-${d.slice(0, 2)}-${d.slice(2, 4)}`;
}

function validate(f: Fields): Partial<Record<keyof Fields, string>> {
  const errors: Partial<Record<keyof Fields, string>> = {};
  if (!f.firstName.trim()) errors.firstName = 'Please enter your first name';
  if (!f.lastName.trim()) errors.lastName = 'Please enter your last name';
  if (!f.email.trim()) errors.email = 'Please enter your email address';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    errors.email = 'Please enter a valid email address';
  if (!f.dob.trim()) errors.dob = 'Please enter your date of birth';
  else if (!dobToIso(f.dob))
    errors.dob = 'Enter a valid date of birth (you must be 18 or older)';
  if (!f.addressLine1.trim())
    errors.addressLine1 = 'Please enter your street address';
  if (!f.city.trim()) errors.city = 'Please enter your city';
  if (!f.region)
    errors.region =
      f.country === 'CA' ? 'Please select a province' : 'Please select a state';
  if (!f.postalCode.trim())
    errors.postalCode =
      f.country === 'CA'
        ? 'Please enter your postal code'
        : 'Please enter your zip code';
  if (digits(f.phone).length !== 10)
    errors.phone = 'Please enter a 10-digit mobile number';

  if (f.bankCountry === 'CA') {
    if (digits(f.transitNumber).length !== 5)
      errors.transitNumber = 'Transit number is 5 digits';
    if (digits(f.institutionNumber).length !== 3)
      errors.institutionNumber = 'Institution number is 3 digits';
  } else if (digits(f.routingNumber).length !== 9) {
    errors.routingNumber = 'Routing number is 9 digits';
  }
  const account = digits(f.accountNumber);
  if (account.length < 4 || account.length > 17)
    errors.accountNumber = 'Please enter your account number';
  if (!f.confirmAccountNumber.trim())
    errors.confirmAccountNumber = 'Please confirm your account number';
  else if (f.accountNumber !== f.confirmAccountNumber)
    errors.confirmAccountNumber = 'Account numbers do not match';

  return errors;
}

export default function GetPaidForm({ returnPath, onComplete }: Props) {
  const { user } = useAuth();
  const [f, setF] = useState<Fields>({
    ...EMPTY,
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>(
    {},
  );
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Anything we already know about the host is one less thing to retype.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        setF((prev) => ({
          ...prev,
          firstName: prev.firstName || me.firstName || '',
          lastName: prev.lastName || me.lastName || '',
          email: prev.email || me.email || '',
          phone: prev.phone || formatPhone(me.phone || ''),
          addressLine1: prev.addressLine1 || me.addressLine || '',
          city: prev.city || me.addressCity || '',
        }));
      } catch {
        /* prefill is best effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
    if (touched) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setCountry = (country: Country) => {
    setF((prev) => ({
      ...prev,
      country,
      region: '',
      postalCode: '',
      bankCountry: country,
      currency: country === 'CA' ? 'CAD' : 'USD',
    }));
  };

  /** Picking a suggestion fills in the rest of the address for them. */
  const applyPlace = (place: ParsedPlace) => {
    const country = countryFromPlace(place.country);
    setF((prev) => {
      const nextCountry = country ?? prev.country;
      const region = regionsForCountry(nextCountry).find(
        (r) => r.code === place.regionCode,
      );
      return {
        ...prev,
        addressLine1: place.street || prev.addressLine1,
        city: place.city || prev.city,
        country: nextCountry,
        region: region?.code ?? '',
        postalCode: place.postalCode
          ? formatPostal(place.postalCode, nextCountry)
          : '',
        bankCountry: country ?? prev.bankCountry,
        currency: country
          ? country === 'CA'
            ? 'CAD'
            : 'USD'
          : prev.currency,
      };
    });
    setErrors((prev) => ({
      ...prev,
      addressLine1: undefined,
      city: undefined,
      region: undefined,
      postalCode: undefined,
    }));
  };

  const err = (key: keyof Fields) => (touched ? errors[key] : undefined);
  const inputClass = (key: keyof Fields) =>
    err(key) ? 'get-paid-input get-paid-input--error' : 'get-paid-input';
  const selectClass = (key: keyof Fields) =>
    [
      'get-paid-input',
      'get-paid-select',
      f[key] ? '' : 'is-placeholder',
      err(key) ? 'get-paid-input--error' : '',
    ]
      .filter(Boolean)
      .join(' ');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const found = validate(f);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document
        .querySelector('.get-paid-input--error, .get-paid-field-error')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      const origin = window.location.origin;
      const result = await submitPayoutSetup({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        email: f.email.trim(),
        dateOfBirth: dobToIso(f.dob) as string,
        addressLine1: f.addressLine1.trim(),
        addressLine2: f.addressLine2.trim() || undefined,
        city: f.city.trim(),
        region: f.region,
        postalCode: f.postalCode.trim(),
        country: f.country,
        phone: digits(f.phone),
        businessDescription: f.businessDescription.trim() || undefined,
        currency: f.currency,
        bankCountry: f.bankCountry,
        accountNumber: digits(f.accountNumber),
        transitNumber:
          f.bankCountry === 'CA' ? digits(f.transitNumber) : undefined,
        institutionNumber:
          f.bankCountry === 'CA' ? digits(f.institutionNumber) : undefined,
        routingNumber:
          f.bankCountry === 'US' ? digits(f.routingNumber) : undefined,
        returnUrl: `${origin}${returnPath}?payout=return`,
        refreshUrl: `${origin}${returnPath}?payout=refresh`,
      });

      try {
        sessionStorage.setItem('ryr_payout_setup_complete', '1');
      } catch {
        /* ignore */
      }

      // Stripe owns terms acceptance, so it may still need a short confirmation.
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      onComplete();
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not save your payout details.',
      );
      setBusy(false);
    }
  };

  const isCa = f.country === 'CA';
  const bankIsCa = f.bankCountry === 'CA';

  return (
    <form className="get-paid-form" onSubmit={(e) => void onSubmit(e)}>
      <h1 className="get-paid-form-title">
        <span className="get-paid-gate-ready">Ready</span> to start earning?
      </h1>
      <p className="get-paid-form-lead">
        Add your payout information so we can pay you directly. Your details go
        straight to Stripe, our payments partner — we never store your bank
        numbers.
      </p>

      <section className="get-paid-section">
        <h2 className="get-paid-section-title">Personal details</h2>
        <p className="get-paid-section-lead">
          Tell us a few details about yourself
        </p>

        <div className="get-paid-row">
          <label className="get-paid-field">
            <span className="get-paid-label">First name</span>
            <input
              className={inputClass('firstName')}
              value={f.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              autoComplete="given-name"
            />
            {err('firstName') ? (
              <span className="get-paid-field-error">{err('firstName')}</span>
            ) : null}
          </label>
          <label className="get-paid-field">
            <span className="get-paid-label">Last name</span>
            <input
              className={inputClass('lastName')}
              value={f.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              autoComplete="family-name"
            />
            {err('lastName') ? (
              <span className="get-paid-field-error">{err('lastName')}</span>
            ) : null}
          </label>
        </div>

        <div className="get-paid-row">
          <label className="get-paid-field">
            <span className="get-paid-label">Email address</span>
            <input
              className={inputClass('email')}
              value={f.email}
              onChange={(e) => set('email', e.target.value)}
              type="email"
              autoComplete="email"
            />
            {err('email') ? (
              <span className="get-paid-field-error">{err('email')}</span>
            ) : null}
          </label>
          <label className="get-paid-field">
            <span className="get-paid-label">Date of birth</span>
            <input
              className={inputClass('dob')}
              value={f.dob}
              onChange={(e) => set('dob', formatDob(e.target.value))}
              placeholder="MM / DD / YYYY"
              inputMode="numeric"
            />
            {err('dob') ? (
              <span className="get-paid-field-error">{err('dob')}</span>
            ) : null}
          </label>
        </div>

        <div className="get-paid-row">
          <label className="get-paid-field">
            <span className="get-paid-label">Mobile number</span>
            <input
              className={inputClass('phone')}
              value={f.phone}
              onChange={(e) => set('phone', formatPhone(e.target.value))}
              placeholder="(204) 555-0134"
              inputMode="tel"
              autoComplete="tel-national"
            />
            {err('phone') ? (
              <span className="get-paid-field-error">{err('phone')}</span>
            ) : null}
          </label>
          <label className="get-paid-field">
            <span className="get-paid-label">Country</span>
            <select
              className={selectClass('country')}
              value={f.country}
              onChange={(e) => setCountry(e.target.value as Country)}
            >
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
          </label>
        </div>
      </section>

      <section className="get-paid-section">
        <h2 className="get-paid-section-title">Home address</h2>
        <p className="get-paid-section-lead">
          This has to match the address on file with your bank
        </p>

        <div className="get-paid-field">
          <span className="get-paid-label">Address line 1</span>
          <div
            className={
              err('addressLine1')
                ? 'get-paid-places get-paid-places--error'
                : 'get-paid-places'
            }
          >
            <PlacesAutocomplete
              value={f.addressLine1}
              onChange={(text) => set('addressLine1', text)}
              onPlaceSelected={applyPlace}
              placeholder="Start typing your street address"
              showLabel={false}
            />
          </div>
          {err('addressLine1') ? (
            <span className="get-paid-field-error">{err('addressLine1')}</span>
          ) : null}
        </div>

        <label className="get-paid-field">
          <span className="get-paid-label">Address line 2</span>
          <input
            className="get-paid-input"
            value={f.addressLine2}
            onChange={(e) => set('addressLine2', e.target.value)}
            placeholder="Apartment, unit, suite (optional)"
            autoComplete="address-line2"
          />
        </label>

        <div className="get-paid-row">
          <label className="get-paid-field">
            <span className="get-paid-label">City</span>
            <input
              className={inputClass('city')}
              value={f.city}
              onChange={(e) => set('city', e.target.value)}
              autoComplete="address-level2"
            />
            {err('city') ? (
              <span className="get-paid-field-error">{err('city')}</span>
            ) : null}
          </label>
          <label className="get-paid-field">
            <span className="get-paid-label">
              {isCa ? 'Province' : 'State'}
            </span>
            <select
              className={selectClass('region')}
              value={f.region}
              onChange={(e) => set('region', e.target.value)}
            >
              <option value="">Select</option>
              {regionsForCountry(f.country).map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
            {err('region') ? (
              <span className="get-paid-field-error">{err('region')}</span>
            ) : null}
          </label>
          <label className="get-paid-field">
            <span className="get-paid-label">
              {isCa ? 'Postal code' : 'Zip code'}
            </span>
            <input
              className={inputClass('postalCode')}
              value={f.postalCode}
              onChange={(e) =>
                set('postalCode', formatPostal(e.target.value, f.country))
              }
              placeholder={isCa ? 'A1A 1A1' : '12345'}
              autoComplete="postal-code"
            />
            {err('postalCode') ? (
              <span className="get-paid-field-error">{err('postalCode')}</span>
            ) : null}
          </label>
        </div>
      </section>

      <section className="get-paid-section">
        <h2 className="get-paid-section-title">About you</h2>
        <p className="get-paid-section-lead">
          In a few sentences, describe what you'll be renting out
        </p>
        <label className="get-paid-field">
          <textarea
            className="get-paid-input get-paid-textarea"
            value={f.businessDescription}
            onChange={(e) => set('businessDescription', e.target.value)}
            rows={4}
            maxLength={600}
            placeholder="Tell us about yourself and the vehicles you plan to host"
          />
        </label>
      </section>

      <section className="get-paid-section">
        <h2 className="get-paid-section-title">Payout details</h2>
        <p className="get-paid-section-lead">
          Tell us where you'd like to receive your payouts
        </p>

        <div className="get-paid-row">
          <label className="get-paid-field">
            <span className="get-paid-label">Currency</span>
            <select
              className={selectClass('currency')}
              value={f.currency}
              onChange={(e) =>
                set('currency', e.target.value as Fields['currency'])
              }
            >
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="USD">USD - US Dollar</option>
            </select>
          </label>
          <label className="get-paid-field">
            <span className="get-paid-label">Country of bank account</span>
            <select
              className={selectClass('bankCountry')}
              value={f.bankCountry}
              onChange={(e) => set('bankCountry', e.target.value as Country)}
            >
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
          </label>
        </div>

        {bankIsCa ? (
          <div className="get-paid-row">
            <label className="get-paid-field">
              <span className="get-paid-label">Transit number</span>
              <input
                className={inputClass('transitNumber')}
                value={f.transitNumber}
                onChange={(e) =>
                  set('transitNumber', digits(e.target.value).slice(0, 5))
                }
                placeholder="12345"
                inputMode="numeric"
              />
              {err('transitNumber') ? (
                <span className="get-paid-field-error">
                  {err('transitNumber')}
                </span>
              ) : null}
            </label>
            <label className="get-paid-field">
              <span className="get-paid-label">Institution number</span>
              <input
                className={inputClass('institutionNumber')}
                value={f.institutionNumber}
                onChange={(e) =>
                  set('institutionNumber', digits(e.target.value).slice(0, 3))
                }
                placeholder="000"
                inputMode="numeric"
              />
              {err('institutionNumber') ? (
                <span className="get-paid-field-error">
                  {err('institutionNumber')}
                </span>
              ) : null}
            </label>
          </div>
        ) : (
          <label className="get-paid-field">
            <span className="get-paid-label">Routing number</span>
            <input
              className={inputClass('routingNumber')}
              value={f.routingNumber}
              onChange={(e) =>
                set('routingNumber', digits(e.target.value).slice(0, 9))
              }
              placeholder="110000000"
              inputMode="numeric"
            />
            {err('routingNumber') ? (
              <span className="get-paid-field-error">
                {err('routingNumber')}
              </span>
            ) : null}
          </label>
        )}

        <div className="get-paid-row">
          <label className="get-paid-field">
            <span className="get-paid-label">Account number</span>
            <input
              className={inputClass('accountNumber')}
              value={f.accountNumber}
              onChange={(e) =>
                set('accountNumber', digits(e.target.value).slice(0, 17))
              }
              placeholder="000123456789"
              inputMode="numeric"
            />
            {err('accountNumber') ? (
              <span className="get-paid-field-error">
                {err('accountNumber')}
              </span>
            ) : null}
          </label>
          <label className="get-paid-field">
            <span className="get-paid-label">Confirm account number</span>
            <input
              className={inputClass('confirmAccountNumber')}
              value={f.confirmAccountNumber}
              onChange={(e) =>
                set('confirmAccountNumber', digits(e.target.value).slice(0, 17))
              }
              placeholder="000123456789"
              inputMode="numeric"
            />
            {err('confirmAccountNumber') ? (
              <span className="get-paid-field-error">
                {err('confirmAccountNumber')}
              </span>
            ) : null}
          </label>
        </div>
      </section>

      {formError ? <p className="get-paid-form-error">{formError}</p> : null}

      <p className="get-paid-legal">
        By saving, you agree to the Stripe{' '}
        <a
          href="https://stripe.com/legal/connect-account"
          target="_blank"
          rel="noreferrer"
        >
          Connected Account Agreement
        </a>
        , to receiving autodialed text messages from Stripe, and you certify
        that the information you have provided is complete and correct. Stripe,
        Inc. is a registered ISO of Wells Fargo Bank, N.A., Concord, CA.
      </p>

      <button type="submit" className="get-paid-gate-cta" disabled={busy}>
        {busy ? 'Saving…' : 'Save and continue'}
      </button>
    </form>
  );
}
