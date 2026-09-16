import { useCallback } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import * as paymentsApi from '../services/paymentsApi';
import { isStripeClientSecret } from '../constants/stripe';

/**
 * Confirm a SetupIntent created by the API and attach the card to the Stripe customer.
 */
export function useSavePaymentCard() {
  const { confirmSetupIntent } = useStripe();

  const saveCard = useCallback(
    async ({ billingDetails } = {}) => {
      const { clientSecret } = await paymentsApi.createSetupIntent();
      if (!isStripeClientSecret(clientSecret)) {
        const err = new Error('Card payments are not available on the server yet.');
        err.code = 'STRIPE_NOT_CONFIGURED';
        throw err;
      }

      const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: billingDetails
          ? { billingDetails }
          : undefined,
      });

      if (error) {
        throw new Error(error.message || 'Could not save card');
      }

      const paymentMethodId = setupIntent?.paymentMethodId;
      if (!paymentMethodId) {
        throw new Error('No payment method returned from Stripe');
      }

      await paymentsApi.setDefaultPaymentMethod(paymentMethodId);
      return paymentMethodId;
    },
    [confirmSetupIntent],
  );

  return { saveCard };
}
