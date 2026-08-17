import { useState, type FormEvent } from 'react';
import {
  CardElement,
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

type AddCardFormProps = {
  onSaved: (paymentMethodId: string) => void;
  onCancel: () => void;
};

function AddCardFormInner({ onSaved, onCancel }: AddCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setSaving(true);
    try {
      const { clientSecret } = await createSetupIntent();
      if (!isStripeClientSecret(clientSecret)) {
        throw new Error('Card payments are not available on the server yet.');
      }
      const card = elements.getElement(CardElement);
      if (!card) throw new Error('Card form is not ready');

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card },
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
      <div className="checkout-card-element">
        <CardElement
          options={{
            style: {
              base: {
                fontFamily: 'Nunito, sans-serif',
                fontSize: '15px',
                color: '#17252a',
                '::placeholder': { color: '#ababab' },
              },
              invalid: { color: '#f9493a' },
            },
          }}
        />
      </div>
      {error ? <p className="checkout-error">{error}</p> : null}
      <div className="checkout-add-card-actions">
        <button
          type="button"
          className="checkout-link-btn"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
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
