import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null;

  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
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
    const pms = await this.stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });
    return pms.data.map((pm) => ({
      id: pm.id,
      type: 'card',
      brand: pm.card?.brand ?? 'card',
      last4: pm.card?.last4 ?? '0000',
    }));
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    if (!this.stripe) {
      return { ok: true };
    }
    const user = await this.users.requireById(userId);
    if (!user.stripeCustomerId) return { ok: false };
    await this.stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    return { ok: true };
  }
}
