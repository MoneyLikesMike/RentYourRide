import { useState, type FormEvent } from 'react';
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  createSetupIntent,
  isStripeClientSecret,
  reportPaymentMethodAdded,
  setDefaultPaymentMethod,
} from '../api/payments';
import { ApiError } from '../api/http';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}

export function isWebStripeConfigured(): boolean {
  return Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim());
}

const ELEMENT_STYLE = {
  base: {
    fontFamily: 'Nunito, sans-serif',
    fontSize: '15px',
    fontWeight: '600',
    color: '#17252a',
    '::placeholder': { color: '#ababab' },
  },
  invalid: { color: '#f9493a' },
};

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
] as const;

type CountryCode = (typeof COUNTRIES)[number]['code'];

type AddCardFormProps = {
  onSaved: (paymentMethodId: string) => void;
  onCancel?: () => void;
};

function AddCardFormInner({ onSaved, onCancel }: AddCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState('');
  const [country, setCountry] = useState<CountryCode>('US');
  const [postalCode, setPostalCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ name: false, zip: false });

  const nameOk = cardholderName.trim().length > 0;
  const zipOk = postalCode.trim().length > 0;
  const zipLabel = country === 'US' ? 'Zip code' : 'Postal code';
  const zipPlaceholder = country === 'US' ? '12345' : 'A1A 1A1';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, zip: true });
    if (!stripe || !elements) return;
    if (!nameOk || !zipOk) {
      setError(
        !nameOk
          ? 'Please enter the cardholder name from your verified license.'
          : `Please enter ${country === 'US' ? 'zip' : 'postal'} code.`,
      );
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { clientSecret } = await createSetupIntent();
      if (!isStripeClientSecret(clientSecret)) {
        throw new Error('Card payments are not available on the server yet.');
      }
      const cardNumber = elements.getElement(CardNumberElement);
      if (!cardNumber) throw new Error('Card form is not ready');

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardNumber,
          billing_details: {
            name: cardholderName.trim(),
            address: {
              country,
              postal_code: postalCode.trim(),
            },
          },
        },
      });
      if (result.error) {
        throw new Error(result.error.message || 'Could not save card');
      }
      const pmId = result.setupIntent?.payment_method;
      const id = typeof pmId === 'string' ? pmId : pmId?.id;
      if (!id) throw new Error('No payment method returned from Stripe');

      await reportPaymentMethodAdded(id);
      await setDefaultPaymentMethod(id);
      onSaved(id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save card',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="checkout-add-card" onSubmit={onSubmit}>
      <label className="checkout-add-card-name">
        <span className="checkout-add-card-label">Cardholder name</span>
        <input
          className="checkout-add-card-input"
          type="text"
          placeholder="Name on your verified license"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          autoComplete="cc-name"
          disabled={saving}
        />
        {touched.name && !nameOk ? (
          <span className="checkout-error">Please enter cardholder name.</span>
        ) : null}
      </label>
      <label className="checkout-add-card-name">
        <span className="checkout-add-card-label">Card number</span>
        <div className="checkout-card-element">
          <CardNumberElement
            options={{
              style: ELEMENT_STYLE,
              placeholder: '4242  4242  4242  4242',
            }}
          />
        </div>
      </label>
      <div className="checkout-add-card-row">
        <label className="checkout-add-card-name">
          <span className="checkout-add-card-label">Exp. date</span>
          <div className="checkout-card-element">
            <CardExpiryElement
              options={{ style: ELEMENT_STYLE, placeholder: '12 / 34' }}
            />
          </div>
        </label>
        <label className="checkout-add-card-name">
          <span className="checkout-add-card-label">CVV</span>
          <div className="checkout-card-element">
            <CardCvcElement
              options={{ style: ELEMENT_STYLE, placeholder: '123' }}
            />
          </div>
        </label>
      </div>
      <div className="checkout-add-card-row">
        <label className="checkout-add-card-name">
          <span className="checkout-add-card-label">Country</span>
          <select
            className="checkout-add-card-input"
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            autoComplete="country"
            disabled={saving}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="checkout-add-card-name">
          <span className="checkout-add-card-label">{zipLabel}</span>
          <input
            className="checkout-add-card-input"
            type="text"
            placeholder={zipPlaceholder}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, zip: true }))}
            autoComplete="postal-code"
            disabled={saving}
          />
          {touched.zip && !zipOk ? (
            <span className="checkout-error">
              Please enter {country === 'US' ? 'zip' : 'postal'} code.
            </span>
          ) : null}
        </label>
      </div>
      {error ? <p className="checkout-error">{error}</p> : null}
      <div className="checkout-add-card-actions">
        {onCancel ? (
          <button
            type="button"
            className="checkout-link-btn"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          className="checkout-primary-btn checkout-primary-btn--sm"
          disabled={saving || !stripe}
        >
          {saving ? 'Saving…' : 'Save card'}
        </button>
      </div>
    </form>
  );
}

export default function AddCardPanel(props: AddCardFormProps) {
  if (!isWebStripeConfigured()) {
    return (
      <p className="checkout-error">
        Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY for local
        checkout.
      </p>
    );
  }

  return (
    <Elements stripe={getStripePromise()}>
      <AddCardFormInner {...props} />
    </Elements>
  );
}
