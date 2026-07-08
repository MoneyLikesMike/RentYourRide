import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useStripe, PlatformPay } from '@stripe/stripe-react-native';
import * as paymentsApi from '../services/paymentsApi';
import { isApplePayConfigured, isStripeClientSecret } from '../constants/stripe';

function formatAmount(dollars) {
  return Number(dollars).toFixed(2);
}

function buildApplePayParams(label, totalDollars) {
  const amount = formatAmount(totalDollars);
  return {
    applePay: {
      cartItems: [
        {
          label,
          amount,
          paymentType: PlatformPay.PaymentType.Immediate,
        },
        {
          label: 'Rent Your Ride',
          amount,
          paymentType: PlatformPay.PaymentType.Immediate,
        },
      ],
      merchantCountryCode: 'CA',
      currencyCode: 'CAD',
    },
  };
}

/**
 * Apple Pay for booking checkout — charge via PaymentIntent or save a card via SetupIntent.
 */
export function useApplePayCheckout() {
  const { isPlatformPaySupported, confirmPlatformPayPayment, confirmPlatformPaySetupIntent } =
    useStripe();
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !isApplePayConfigured()) {
      setSupported(false);
      return undefined;
    }
    let mounted = true;
    isPlatformPaySupported()
      .then((result) => {
        if (mounted) setSupported(Boolean(result));
      })
      .catch(() => {
        if (mounted) setSupported(false);
      });
    return () => {
      mounted = false;
    };
  }, [isPlatformPaySupported]);

  const payForBooking = useCallback(
    async ({ amountDollars, description, metadata }) => {
      const amountCents = Math.round(Number(amountDollars) * 100);
      if (!Number.isFinite(amountCents) || amountCents < 50) {
        throw new Error('Invalid payment amount');
      }
      const { clientSecret, paymentIntentId } = await paymentsApi.createPaymentIntent({
        amountCents,
        currency: 'cad',
        metadata,
      });
      if (!isStripeClientSecret(clientSecret)) {
        throw new Error('Apple Pay is not available on the server yet.');
      }
      const { error, paymentIntent } = await confirmPlatformPayPayment(
        clientSecret,
        buildApplePayParams(description || 'Vehicle rental', amountDollars),
      );
      if (error) {
        throw new Error(error.message || 'Apple Pay failed');
      }
      const status = paymentIntent?.status;
      if (status && status !== 'Succeeded' && status !== 'succeeded') {
        throw new Error('Payment was not completed');
      }
      return {
        paymentIntentId: paymentIntent?.id || paymentIntentId,
        paymentMethod: {
          type: 'apple_pay',
          paymentMethodId: paymentIntent?.paymentMethodId,
        },
      };
    },
    [confirmPlatformPayPayment],
  );

  const savePaymentMethod = useCallback(
    async ({ amountDollars, description }) => {
      const { clientSecret } = await paymentsApi.createSetupIntent();
      if (!isStripeClientSecret(clientSecret)) {
        throw new Error('Apple Pay is not available on the server yet.');
      }
      const displayAmount = Number(amountDollars) > 0 ? Number(amountDollars) : 0;
      const { error, setupIntent } = await confirmPlatformPaySetupIntent(
        clientSecret,
        buildApplePayParams(description || 'Save payment method', displayAmount),
      );
      if (error) {
        throw new Error(error.message || 'Apple Pay failed');
      }
      const paymentMethodId = setupIntent?.paymentMethodId;
      if (!paymentMethodId) {
        throw new Error('No payment method returned from Apple Pay');
      }
      await paymentsApi.setDefaultPaymentMethod(paymentMethodId);
      return {
        type: 'apple_pay',
        id: paymentMethodId,
        paymentMethodId,
        brand: 'apple_pay',
        last4: 'Pay',
      };
    },
    [confirmPlatformPaySetupIntent],
  );

  return { supported, payForBooking, savePaymentMethod };
}
