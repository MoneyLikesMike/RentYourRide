import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { initStripe, useStripe, PlatformPay } from '@stripe/stripe-react-native';
import * as paymentsApi from '../services/paymentsApi';
import {
  getStripeMerchantIdentifier,
  getStripePublishableKey,
  isApplePayConfigured,
  isStripeClientSecret,
} from '../constants/stripe';

const SUPPORT_CHECK_TIMEOUT_MS = 4000;

function formatAmount(dollars) {
  return Number(dollars).toFixed(2);
}

/** Apple Pay sheet: CAD, line items, hold wording for request-to-book. */
function buildApplePayParams(label, totalDollars, { isHold = false } = {}) {
  const amount = formatAmount(totalDollars);
  const cartLabel = isHold ? `${label} (hold)` : label;
  return {
    applePay: {
      cartItems: [
        {
          label: cartLabel,
          amount,
          paymentType: PlatformPay.PaymentType.Immediate,
        },
      ],
      merchantCountryCode: 'CA',
      currencyCode: 'CAD',
    },
  };
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Apple Pay support check timed out')), ms);
    }),
  ]);
}

/**
 * Apple Pay for booking checkout — lazy Stripe merchant init (not at app boot).
 */
export function useApplePayCheckout() {
  const { isPlatformPaySupported, confirmPlatformPayPayment, confirmPlatformPaySetupIntent } =
    useStripe();
  const [supported, setSupported] = useState(false);
  const initStarted = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !isApplePayConfigured()) {
      setSupported(false);
      return undefined;
    }
    let mounted = true;

    (async () => {
      try {
        if (!initStarted.current) {
          initStarted.current = true;
          const publishableKey = getStripePublishableKey();
          const merchantIdentifier = getStripeMerchantIdentifier();
          if (publishableKey && merchantIdentifier) {
            await initStripe({ publishableKey, merchantIdentifier });
          }
        }
        const result = await withTimeout(
          isPlatformPaySupported(),
          SUPPORT_CHECK_TIMEOUT_MS,
        );
        if (mounted) setSupported(Boolean(result));
      } catch (_) {
        if (mounted) setSupported(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isPlatformPaySupported]);

  /** Instant book: automatic-capture PI + on-session Platform Pay. */
  const payForBooking = useCallback(
    async ({ amountDollars, description, metadata, idempotencyKey }) => {
      const amountCents = Math.round(Number(amountDollars) * 100);
      if (!Number.isFinite(amountCents) || amountCents < 50) {
        throw new Error('Invalid payment amount');
      }
      const { clientSecret, paymentIntentId } = await paymentsApi.createPaymentIntent({
        amountCents,
        currency: 'cad',
        metadata,
        applePayInstant: true,
        idempotencyKey,
      });
      if (!isStripeClientSecret(clientSecret)) {
        throw new Error('Apple Pay is not available on the server yet.');
      }
      const { error, paymentIntent } = await confirmPlatformPayPayment(
        clientSecret,
        buildApplePayParams(description || 'Vehicle rental', amountDollars, {
          isHold: false,
        }),
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

  /**
   * Request-to-book: manual-capture hold confirmed on-session (no SetupIntent
   * + separate off-session preauth).
   */
  const authorizeBookingHold = useCallback(
    async ({ amountDollars, description, metadata, attemptKey, attempt }) => {
      const amountCents = Math.round(Number(amountDollars) * 100);
      if (!Number.isFinite(amountCents) || amountCents < 50) {
        throw new Error('Invalid payment amount');
      }
      const { clientSecret, paymentIntentId } = await paymentsApi.createApplePayHold({
        amountCents,
        currency: 'cad',
        metadata,
        attemptKey,
        attempt,
      });
      if (!isStripeClientSecret(clientSecret)) {
        throw new Error('Apple Pay is not available on the server yet.');
      }
      const { error, paymentIntent } = await confirmPlatformPayPayment(
        clientSecret,
        buildApplePayParams(description || 'Vehicle rental', amountDollars, {
          isHold: true,
        }),
      );
      if (error) {
        throw new Error(error.message || 'Apple Pay failed');
      }
      const status = paymentIntent?.status;
      // Manual capture → RequiresCapture / requires_capture after confirm.
      const ok =
        !status ||
        status === 'Succeeded' ||
        status === 'succeeded' ||
        status === 'RequiresCapture' ||
        status === 'requires_capture';
      if (!ok) {
        throw new Error('Payment hold was not completed');
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

  return {
    supported,
    payForBooking,
    authorizeBookingHold,
    savePaymentMethod,
  };
}
