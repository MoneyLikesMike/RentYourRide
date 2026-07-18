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
    fontSize: '15px',
    color: '#17252a',
    '::placeholder': { color: '#ababab' },
  },
  invalid: { color: '#ea0c0c' },
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (paymentMethodId: string) => void;
};

function AddPaymentMethodForm({ onClose, onSaved }: Omit<Props, 'open'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [tab, setTab] = useState<'card' | 'paypal'>('card');
  const [cardholderName, setCardholderName] = useState('');
  const [country, setCountry] = useState('Canada');
  const [postalCode, setPostalCode] = useState('');
  const [touched, setTouched] = useState({
    name: false,
    country: false,
    zip: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOk = cardholderName.trim().length > 0;
  const countryOk = country.trim().length > 0;
  const zipOk = postalCode.trim().length > 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, country: true, zip: true });
    if (!nameOk || !countryOk || !zipOk) return;
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
              country: country.trim().length === 2
                ? country.trim().toUpperCase()
                : country.trim().toLowerCase().includes('canada')
                  ? 'CA'
                  : country.trim().toLowerCase().includes('united')
                    ? 'US'
                    : undefined,
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
        <>
          <label className="add-pay-field">
            <span className="add-pay-label">Cardholder Name</span>
            <input
              className={`add-pay-input${!touched.name || nameOk ? '' : ' is-error'}`}
              type="text"
              placeholder="Enter Cardholder Name"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            />
            {touched.name && !nameOk ? (
              <span className="add-pay-error-text">
                Please enter cardholder name!
              </span>
            ) : null}
          </label>

          <div className="add-pay-field">
            <span className="add-pay-label">Card Number</span>
            <div className="add-pay-stripe">
              <CardNumberElement options={{ style: ELEMENT_STYLE }} />
            </div>
          </div>

          <div className="add-pay-row">
            <div className="add-pay-field add-pay-half">
              <span className="add-pay-label">Exp. date</span>
              <div className="add-pay-stripe">
                <CardExpiryElement options={{ style: ELEMENT_STYLE }} />
              </div>
            </div>
            <div className="add-pay-field add-pay-half">
              <span className="add-pay-label">CVV</span>
              <div className="add-pay-stripe">
                <CardCvcElement options={{ style: ELEMENT_STYLE }} />
              </div>
            </div>
          </div>

          <div className="add-pay-row">
            <label className="add-pay-field add-pay-half">
              <span className="add-pay-label">Country</span>
              <input
                className={`add-pay-input${!touched.country || countryOk ? '' : ' is-error'}`}
                type="text"
                placeholder="Enter Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, country: true }))}
              />
              {touched.country && !countryOk ? (
                <span className="add-pay-error-text">Please enter Country!</span>
              ) : null}
            </label>
            <label className="add-pay-field add-pay-half">
              <span className="add-pay-label">Zip code</span>
              <input
                className={`add-pay-input${!touched.zip || zipOk ? '' : ' is-error'}`}
                type="text"
                placeholder="Enter Zip code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, zip: true }))}
              />
              {touched.zip && !zipOk ? (
                <span className="add-pay-error-text">
                  Please enter Postal Code!
                </span>
              ) : null}
            </label>
          </div>
        </>
      )}

      {error ? <p className="add-pay-error-text">{error}</p> : null}

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
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function AddPaymentMethodModal({
  open,
  onClose,
  onSaved,
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
          <Elements stripe={getStripePromise()}>
            <AddPaymentMethodForm onClose={onClose} onSaved={onSaved} />
          </Elements>
        )}
      </div>
    </div>
  );
}
