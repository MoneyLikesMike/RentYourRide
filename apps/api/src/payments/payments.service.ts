import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { guestIdentityNameParts } from '../common/guest-identity-name';
import {
  cardholderNameMatchesIdentity,
  CARDHOLDER_LICENSE_NAME_MISMATCH_MESSAGE,
  type IdentityNameParts,
} from '../common/name-match';

/** How long after Stripe creates a card we still treat it as newly added. */
const NEW_CARD_WINDOW_MS = 30 * 60 * 1000;

export type BookingPaymentResult = {
  paymentIntentId: string;
  chargeId: string | null;
  amountCents: number;
  funding: string | null;
};

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);
  private stripe: Stripe | null;
  private readonly notifiedCards = new Map<string, number>();

  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
  }

  isConfigured(): boolean {
    return !!this.stripe;
  }

  /** When the guest has a verified license, card billing name must match that identity. */
  private async identityForCardMatch(userId: string): Promise<IdentityNameParts | null> {
    const user = await this.users.requireById(userId);
    if (!user.licenseVerified) return null;
    return guestIdentityNameParts(user);
  }

  private assertCardholderMatchesIdentity(
    cardholderName: string | null | undefined,
    identity: IdentityNameParts,
  ): void {
    if (!cardholderNameMatchesIdentity(cardholderName, identity)) {
      throw new BadRequestException(CARDHOLDER_LICENSE_NAME_MISMATCH_MESSAGE);
    }
  }

  /**
   * Apple Pay / Google Pay often create Stripe PaymentMethods with an empty
   * billing_details.name (device wallet does not always send cardholder name).
   * Manual cards still require a matching name.
   */
  private isDeviceWalletWithoutCardholderName(
    pm: Stripe.PaymentMethod,
  ): boolean {
    const wallet = pm.card?.wallet?.type;
    if (wallet !== 'apple_pay' && wallet !== 'google_pay') return false;
    return !(pm.billing_details?.name || '').trim();
  }

  private paymentMethodMatchesGuestIdentity(
    pm: Stripe.PaymentMethod,
    identity: IdentityNameParts,
  ): boolean {
    if (cardholderNameMatchesIdentity(pm.billing_details?.name, identity)) {
      return true;
    }
    return this.isDeviceWalletWithoutCardholderName(pm);
  }

  private assertPaymentMethodMatchesIdentity(
    pm: Stripe.PaymentMethod,
    identity: IdentityNameParts,
  ): void {
    if (!this.paymentMethodMatchesGuestIdentity(pm, identity)) {
      throw new BadRequestException(CARDHOLDER_LICENSE_NAME_MISMATCH_MESSAGE);
    }
  }

  private async assertPaymentMethodOwnedByUser(
    userId: string,
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    if (!this.stripe) {
      throw new BadRequestException('Payments not configured');
    }
    const user = await this.users.requireById(userId);
    if (!user.stripeCustomerId) {
      throw new BadRequestException('Payment method not found');
    }
    const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    const customerId =
      typeof pm.customer === 'string' ? pm.customer : pm.customer?.id;
    if (customerId !== user.stripeCustomerId) {
      throw new BadRequestException('Payment method not found');
    }
    return pm;
  }

  async assertPaymentMethodMatchesGuestIdentity(
    userId: string,
    paymentMethodId: string,
  ): Promise<void> {
    const identity = await this.identityForCardMatch(userId);
    if (!identity || !this.stripe) return;
    const pm = await this.assertPaymentMethodOwnedByUser(userId, paymentMethodId);
    this.assertPaymentMethodMatchesIdentity(pm, identity);
  }

  async assertPaymentIntentMatchesGuestIdentity(
    userId: string,
    paymentIntentId: string,
  ): Promise<void> {
    const identity = await this.identityForCardMatch(userId);
    if (!identity || !this.stripe) return;

    const pi = await this.retrievePaymentIntent(paymentIntentId);
    const pmRef = pi.payment_method;
    const pmId = typeof pmRef === 'string' ? pmRef : pmRef?.id;
    if (pmId) {
      await this.assertPaymentMethodMatchesGuestIdentity(userId, pmId);
      return;
    }

    const chargeId = this.chargeIdFromPi(pi);
    if (chargeId) {
      const charge = await this.stripe.charges.retrieve(chargeId);
      const wallet = charge.payment_method_details?.card?.wallet?.type;
      const chargeName = charge.billing_details?.name;
      if (
        !(chargeName || '').trim() &&
        (wallet === 'apple_pay' || wallet === 'google_pay')
      ) {
        return;
      }
      this.assertCardholderMatchesIdentity(chargeName, identity);
    }
  }

  private async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    if (!this.stripe) return;
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
    } catch (err) {
      this.log.warn(
        `Could not detach payment method ${paymentMethodId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private async ensureStripeCustomer(userId: string) {
    const user = await this.users.requireById(userId);
    if (!this.stripe) {
      return {
        customerId: 'mock_cus_' + userId.slice(0, 8),
      };
    }
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const c = await this.stripe.customers.create({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      });
      customerId = c.id;
      await this.users.ensureStripeCustomerId(userId, customerId);
    }
    return { customerId };
  }

  async createSetupIntent(userId: string) {
    if (!this.stripe) {
      return {
        clientSecret: 'mock_setup_' + userId.slice(0, 8),
        customerId: 'mock_cus_' + userId.slice(0, 8),
      };
    }
    const { customerId } = await this.ensureStripeCustomer(userId);
    const si = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    return { clientSecret: si.client_secret, customerId };
  }

  async createPaymentIntent(
    userId: string,
    body: {
      amountCents: number;
      currency?: string;
      metadata?: Record<string, string>;
    },
  ) {
    if (!this.stripe) {
      return {
        clientSecret: 'mock_pi_' + userId.slice(0, 8),
        paymentIntentId: 'mock_pi_' + userId.slice(0, 8),
      };
    }
    const amountCents = Math.round(Number(body.amountCents));
    if (!Number.isFinite(amountCents) || amountCents < 50) {
      throw new BadRequestException('amountCents must be at least 50');
    }
    const { customerId } = await this.ensureStripeCustomer(userId);
    const pi = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: (body.currency || 'cad').toLowerCase(),
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        guestId: userId,
        ...(body.metadata || {}),
      },
    });
    return {
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
    };
  }

  async listMethods(userId: string) {
    if (!this.stripe) {
      return [];
    }
    const user = await this.users.requireById(userId);
    if (!user.stripeCustomerId) return [];
    const customer = await this.stripe.customers.retrieve(user.stripeCustomerId);
    const defaultPm =
      !customer.deleted && customer.invoice_settings?.default_payment_method
        ? typeof customer.invoice_settings.default_payment_method === 'string'
          ? customer.invoice_settings.default_payment_method
          : customer.invoice_settings.default_payment_method.id
        : null;
    const pms = await this.stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });
    const identity = await this.identityForCardMatch(userId);
    return pms.data.map((pm) => ({
      id: pm.id,
      type: 'card',
      brand: pm.card?.brand ?? 'card',
      last4: pm.card?.last4 ?? '0000',
      funding: pm.card?.funding ?? null,
      expMonth: pm.card?.exp_month ?? null,
      expYear: pm.card?.exp_year ?? null,
      isDefault: defaultPm ? pm.id === defaultPm : false,
      cardholderName: pm.billing_details?.name ?? null,
      country: pm.billing_details?.address?.country ?? null,
      postalCode: pm.billing_details?.address?.postal_code ?? null,
      walletType: pm.card?.wallet?.type ?? null,
      cardholderMatchesLicense: identity
        ? this.paymentMethodMatchesGuestIdentity(pm, identity)
        : null,
    }));
  }

  async updateMethodBilling(
    userId: string,
    paymentMethodId: string,
    body: {
      cardholderName?: string;
      country?: string;
      postalCode?: string;
    },
  ) {
    if (!this.stripe) {
      return { ok: true };
    }
    const user = await this.users.requireById(userId);
    if (!user.stripeCustomerId) return { ok: false };

    const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    const customerId =
      typeof pm.customer === 'string' ? pm.customer : pm.customer?.id;
    if (customerId !== user.stripeCustomerId) {
      throw new BadRequestException('Payment method not found');
    }

    const name = body.cardholderName?.trim();
    const country = body.country?.trim().toUpperCase();
    const postalCode = body.postalCode?.trim();

    if (name) {
      const identity = await this.identityForCardMatch(userId);
      if (identity) {
        this.assertCardholderMatchesIdentity(name, identity);
      }
    }

    await this.stripe.paymentMethods.update(paymentMethodId, {
      billing_details: {
        ...(name ? { name } : {}),
        address: {
          ...(country ? { country } : {}),
          ...(postalCode ? { postal_code: postalCode } : {}),
        },
      },
    });
    return { ok: true };
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    if (!this.stripe) {
      return { ok: true };
    }
    const user = await this.users.requireById(userId);
    if (!user.stripeCustomerId) return { ok: false };

    const pm = await this.assertPaymentMethodOwnedByUser(userId, paymentMethodId);
    try {
      await this.assertPaymentMethodMatchesGuestIdentity(userId, paymentMethodId);
    } catch (err) {
      if (this.isFreshlyAdded(pm)) {
        await this.detachPaymentMethod(paymentMethodId);
      }
      throw err;
    }

    await this.stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    if (this.isFreshlyAdded(pm)) {
      this.notifyCardAdded(userId, paymentMethodId);
    }
    return { ok: true };
  }

  /** Cards are attached to Stripe from the client, so clients report the add. */
  async notifyPaymentMethodAdded(userId: string, paymentMethodId: string) {
    if (!this.stripe) {
      return { ok: true };
    }
    const user = await this.users.requireById(userId);
    if (!user.stripeCustomerId) return { ok: false };

    const pm = await this.assertPaymentMethodOwnedByUser(userId, paymentMethodId);
    try {
      await this.assertPaymentMethodMatchesGuestIdentity(userId, paymentMethodId);
    } catch (err) {
      if (this.isFreshlyAdded(pm)) {
        await this.detachPaymentMethod(paymentMethodId);
      }
      throw err;
    }
    this.notifyCardAdded(userId, paymentMethodId);
    return { ok: true };
  }

  private isFreshlyAdded(pm: Stripe.PaymentMethod): boolean {
    return Date.now() - pm.created * 1000 < NEW_CARD_WINDOW_MS;
  }

  /** A single add can reach us twice (explicit report + set-default): email once. */
  private notifyCardAdded(userId: string, paymentMethodId: string): void {
    const now = Date.now();
    for (const [id, at] of this.notifiedCards) {
      if (now - at > NEW_CARD_WINDOW_MS) this.notifiedCards.delete(id);
    }
    if (this.notifiedCards.has(paymentMethodId)) return;
    this.notifiedCards.set(paymentMethodId, now);
    void this.stripe?.paymentMethods
      .retrieve(paymentMethodId)
      .then((pm) => {
        const brand = pm.card?.brand
          ? pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)
          : 'Card';
        const last4 = pm.card?.last4 ? ` •••• ${pm.card.last4}` : '';
        this.notifications.newPaymentMethod(userId, {
          brand: `${brand}${last4}`,
          createdAt: new Date(pm.created * 1000).toUTCString(),
          creationLocation: 'Rent Your Ride',
          fromDevice: 'Mobile App',
        });
      })
      .catch(() => {
        this.notifications.newPaymentMethod(userId);
      });
  }

  async deletePaymentMethod(userId: string, paymentMethodId: string) {
    if (!this.stripe) {
      return { ok: true };
    }
    const user = await this.users.requireById(userId);
    if (!user.stripeCustomerId) return { ok: false };

    const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    const customerId =
      typeof pm.customer === 'string' ? pm.customer : pm.customer?.id;
    if (customerId !== user.stripeCustomerId) {
      throw new BadRequestException('Payment method not found');
    }

    await this.stripe.paymentMethods.detach(paymentMethodId);
    return { ok: true };
  }

  private chargeIdFromPi(pi: Stripe.PaymentIntent): string | null {
    const c = pi.latest_charge;
    if (!c) return null;
    return typeof c === 'string' ? c : c.id;
  }

  private async fundingForPaymentMethod(paymentMethodId: string): Promise<string | null> {
    if (!this.stripe) return null;
    const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    return pm.card?.funding ?? null;
  }

  /**
   * Legacy parity: uncaptured hold on booking create.
   * Credit cards authorize $1; debit/prepaid authorize the full trip amount.
   */
  async createBookingPreauth(opts: {
    guestUserId: string;
    paymentMethodId: string;
    fullAmountCents: number;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<BookingPaymentResult> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    await this.assertPaymentMethodMatchesGuestIdentity(
      opts.guestUserId,
      opts.paymentMethodId,
    );
    const fullAmountCents = Math.round(Number(opts.fullAmountCents));
    if (!Number.isFinite(fullAmountCents) || fullAmountCents < 50) {
      throw new BadRequestException('Invalid booking amount');
    }
    const funding = await this.fundingForPaymentMethod(opts.paymentMethodId);
    const holdCents = funding === 'credit' ? 100 : fullAmountCents;
    const { customerId } = await this.ensureStripeCustomer(opts.guestUserId);

    const pi = await this.stripe.paymentIntents.create({
      amount: holdCents,
      currency: 'cad',
      customer: customerId,
      payment_method: opts.paymentMethodId,
      capture_method: 'manual',
      confirm: true,
      off_session: true,
      description: opts.description,
      metadata: {
        guestId: opts.guestUserId,
        purpose: 'booking_preauth',
        fullAmountCents: String(fullAmountCents),
        funding: funding ?? '',
        ...(opts.metadata || {}),
      },
    });

    if (pi.status !== 'requires_capture' && pi.status !== 'succeeded') {
      this.log.error(`Preauth unexpected status=${pi.status} pi=${pi.id}`);
      throw new BadRequestException('Could not authorize payment method');
    }

    return {
      paymentIntentId: pi.id,
      chargeId: this.chargeIdFromPi(pi),
      amountCents: holdCents,
      funding,
    };
  }

  /**
   * Legacy parity on host approve:
   * - credit: refund/cancel $1 hold, then charge full amount
   * - debit: capture the existing hold
   */
  async captureOrChargeBooking(opts: {
    paymentIntentId: string;
    fullAmountCents: number;
    description: string;
    paymentMethodId?: string | null;
  }): Promise<BookingPaymentResult> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    const fullAmountCents = Math.round(Number(opts.fullAmountCents));
    const pi = await this.stripe.paymentIntents.retrieve(opts.paymentIntentId, {
      expand: ['payment_method'],
    });

    const funding =
      (typeof pi.payment_method === 'object' && pi.payment_method && 'card' in pi.payment_method
        ? pi.payment_method.card?.funding
        : null) ||
      pi.metadata?.funding ||
      null;

    if (funding === 'credit') {
      if (pi.status === 'requires_capture') {
        await this.stripe.paymentIntents.cancel(pi.id);
      } else if (pi.status === 'succeeded') {
        await this.stripe.refunds.create({ payment_intent: pi.id });
      }

      const customerId =
        typeof pi.customer === 'string' ? pi.customer : pi.customer?.id || undefined;
      const paymentMethodId =
        opts.paymentMethodId ||
        (typeof pi.payment_method === 'string'
          ? pi.payment_method
          : pi.payment_method?.id) ||
        undefined;
      if (!customerId || !paymentMethodId) {
        throw new BadRequestException('Missing payment method for capture');
      }

      const charged = await this.stripe.paymentIntents.create({
        amount: fullAmountCents,
        currency: 'cad',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        capture_method: 'automatic',
        description: opts.description,
        metadata: {
          ...(pi.metadata || {}),
          purpose: 'booking_capture',
          replacedPreauth: pi.id,
        },
      });
      if (charged.status !== 'succeeded') {
        throw new BadRequestException('Could not charge payment method');
      }
      return {
        paymentIntentId: charged.id,
        chargeId: this.chargeIdFromPi(charged),
        amountCents: fullAmountCents,
        funding,
      };
    }

    if (pi.status === 'requires_capture') {
      if (opts.description?.trim()) {
        await this.stripe.paymentIntents.update(pi.id, {
          description: opts.description.trim(),
        });
      }
      const captured = await this.stripe.paymentIntents.capture(pi.id);
      return {
        paymentIntentId: captured.id,
        chargeId: this.chargeIdFromPi(captured),
        amountCents: captured.amount_received || captured.amount,
        funding,
      };
    }
    if (pi.status === 'succeeded') {
      return {
        paymentIntentId: pi.id,
        chargeId: this.chargeIdFromPi(pi),
        amountCents: pi.amount_received || pi.amount,
        funding,
      };
    }
    throw new BadRequestException(`Cannot capture payment in status ${pi.status}`);
  }

  async updatePaymentIntentDescription(
    paymentIntentId: string,
    description: string,
  ): Promise<void> {
    if (!this.stripe || !paymentIntentId?.trim() || !description?.trim()) return;
    await this.stripe.paymentIntents.update(paymentIntentId.trim(), {
      description: description.trim(),
    });
  }

  /** Host decline / cancel — release hold or refund captured charge. */
  async refundBookingPayment(paymentIntentId: string, description?: string): Promise<void> {
    if (!this.stripe || !paymentIntentId) return;
    try {
      const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (description) {
        await this.stripe.paymentIntents.update(paymentIntentId, { description });
      }
      if (pi.status === 'requires_capture') {
        await this.stripe.paymentIntents.cancel(paymentIntentId);
        return;
      }
      if (pi.status === 'succeeded') {
        await this.stripe.refunds.create({ payment_intent: paymentIntentId });
      }
    } catch (err) {
      this.log.error(
        `Refund/cancel failed for ${paymentIntentId}`,
        err instanceof Error ? err.message : err,
      );
      throw err;
    }
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Legacy parity: transfer host earnings after check-in, linked to the guest charge.
   */
  async transferToHost(opts: {
    amountCents: number;
    connectAccountId: string;
    sourceChargeId: string;
    description?: string;
  }): Promise<Stripe.Transfer | null> {
    if (!this.stripe) return null;
    const amountCents = Math.round(Number(opts.amountCents));
    if (!Number.isFinite(amountCents) || amountCents < 1) {
      throw new BadRequestException('Invalid transfer amount');
    }
    if (!opts.connectAccountId?.trim() || !opts.sourceChargeId?.trim()) {
      throw new BadRequestException('Connect account and charge required for payout');
    }
    return this.stripe.transfers.create({
      amount: amountCents,
      currency: 'cad',
      destination: opts.connectAccountId.trim(),
      source_transaction: opts.sourceChargeId.trim(),
      description: opts.description,
    });
  }
}
