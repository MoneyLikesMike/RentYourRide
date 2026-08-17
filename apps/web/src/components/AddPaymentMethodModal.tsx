import { useState, type FormEvent } from 'react';
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import {
  createSetupIntent,
  isStripeClientSecret,
  reportPaymentMethodAdded,
  setDefaultPaymentMethod,
} from '../api/payments';
import { ApiError } from '../api/http';
import {
  getStripePromise,
  isWebStripeConfigured,
} from './AddCardPanel';

const ELEMENT_STYLE = {
  base: {
    fontFamily: 'Nunito, sans-serif',
    fontSize: '16px',
    fontWeight: '600',
    letterSpacing: '0',
    color: '#17252a',
    '::placeholder': {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '16px',
      fontWeight: '600',
      letterSpacing: '0',
      color: '#ababab',
    },
  },
  invalid: { color: '#ea0c0c' },
};

const STRIPE_ELEMENTS_OPTIONS = {
  fonts: [
    {
      cssSrc:
        'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap',
    },
  ],
};

/** Same billing countries as mobile AddCardScreen. */
const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
] as const;

type CountryCode = (typeof COUNTRIES)[number]['code'];

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (paymentMethodId: string, opts?: { asDefault?: boolean }) => void;
  /** When true (no other cards), default toggle stays on. */
  forceDefault?: boolean;
};

function AddPaymentMethodForm({
  onClose,
  onSaved,
  forceDefault = false,
}: Omit<Props, 'open'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [tab, setTab] = useState<'card' | 'paypal'>('card');
  const [cardholderName, setCardholderName] = useState('');
  const [country, setCountry] = useState<CountryCode>('US');
  const [postalCode, setPostalCode] = useState('');
  const [makeDefault, setMakeDefault] = useState(true);
  const [touched, setTouched] = useState({
    name: false,
    zip: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOk = cardholderName.trim().length > 0;
  const zipOk = postalCode.trim().length > 0;
  const zipLabel = country === 'US' ? 'Zip code' : 'Postal code';
  const zipPlaceholder = country === 'US' ? '12345' : 'A1A 1A1';
  const willBeDefault = forceDefault || makeDefault;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, zip: true });
    if (!nameOk || !zipOk) return;
    if (!stripe || !elements) return;

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
      if (willBeDefault) {
        await setDefaultPaymentMethod(id);
      }
      onSaved(id, { asDefault: willBeDefault });
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
    <form className="add-pay-modal-form" onSubmit={(e) => void onSubmit(e)}>
      <h2 className="add-pay-modal-title">Add payment method</h2>

      <div className="add-pay-tabs">
        <button
          type="button"
          className={`add-pay-tab${tab === 'card' ? ' is-active' : ''}`}
          onClick={() => setTab('card')}
        >
          Card
        </button>
        <button
          type="button"
          className={`add-pay-tab${tab === 'paypal' ? ' is-active' : ''}`}
          onClick={() => setTab('paypal')}
        >
          Paypal
        </button>
      </div>

      {tab === 'paypal' ? (
        <p className="add-pay-paypal-stub">
          PayPal isn’t available yet. Please add a card.
        </p>
      ) : (
        <div className="add-pay-fields">
          <label className="add-pay-field">
            <span className="add-pay-label">Cardholder Name</span>
            <input
              className={`add-pay-input${!touched.name || nameOk ? '' : ' is-error'}`}
              type="text"
              placeholder="Name"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              autoComplete="cc-name"
            />
            {touched.name && !nameOk ? (
              <span className="add-pay-error-text">
                Please enter cardholder name!
              </span>
            ) : null}
          </label>

          <div className="add-pay-field">
            <span className="add-pay-label">Card number</span>
            <div className="add-pay-stripe">
              <CardNumberElement
                options={{
                  style: ELEMENT_STYLE,
                  placeholder: '4242  4242  4242  4242',
                }}
              />
            </div>
          </div>

          <div className="add-pay-row">
            <div className="add-pay-field add-pay-half">
              <span className="add-pay-label">Exp. date</span>
              <div className="add-pay-stripe">
                <CardExpiryElement
                  options={{
                    style: ELEMENT_STYLE,
                    placeholder: '12 / 34',
                  }}
                />
              </div>
            </div>
            <div className="add-pay-field add-pay-half">
              <span className="add-pay-label">CVV</span>
              <div className="add-pay-stripe">
                <CardCvcElement
                  options={{
                    style: ELEMENT_STYLE,
                    placeholder: '123',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="add-pay-row">
            <label className="add-pay-field add-pay-half">
              <span className="add-pay-label">Country</span>
              <select
                className="add-pay-input add-pay-select"
                value={country}
                onChange={(e) => setCountry(e.target.value as CountryCode)}
                autoComplete="country"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="add-pay-field add-pay-half">
              <span className="add-pay-label">{zipLabel}</span>
              <input
                className={`add-pay-input${!touched.zip || zipOk ? '' : ' is-error'}`}
                type="text"
                placeholder={zipPlaceholder}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, zip: true }))}
                autoComplete="postal-code"
              />
              {touched.zip && !zipOk ? (
                <span className="add-pay-error-text">
                  Please enter {country === 'US' ? 'Zip' : 'Postal'} Code!
                </span>
              ) : null}
            </label>
          </div>
        </div>
      )}

      {error ? <p className="add-pay-error-text">{error}</p> : null}

      <label className="add-pay-default">
        <span className="add-pay-default-label">Set as default</span>
        <span className="add-pay-default-switch">
          <input
            type="checkbox"
            checked={willBeDefault}
            disabled={forceDefault || saving}
            onChange={(e) => setMakeDefault(e.target.checked)}
          />
          <span className="add-pay-default-slider" aria-hidden />
        </span>
      </label>

      <div className="add-pay-actions">
        <button
          type="button"
          className="add-pay-btn add-pay-btn--ghost"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="add-pay-btn add-pay-btn--filled"
          disabled={saving || tab !== 'card' || !stripe}
        >
          {saving ? 'SAVING…' : 'SAVE'}
        </button>
      </div>
    </form>
  );
}

export default function AddPaymentMethodModal({
  open,
  onClose,
  onSaved,
  forceDefault = false,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="add-pay-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="add-pay-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add payment method"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="add-pay-close"
          onClick={onClose}
          aria-label="Close"
        >
          <img src="/close.png" alt="" className="close-x-img" />
        </button>
        {!isWebStripeConfigured() ? (
          <div className="add-pay-modal-form">
            <h2 className="add-pay-modal-title">Add payment method</h2>
            <p className="add-pay-error-text">
              Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY.
            </p>
            <div className="add-pay-actions">
              <button
                type="button"
                className="add-pay-btn add-pay-btn--ghost"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <Elements
            stripe={getStripePromise()}
            options={STRIPE_ELEMENTS_OPTIONS}
          >
            <AddPaymentMethodForm
              onClose={onClose}
              onSaved={onSaved}
              forceDefault={forceDefault}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
