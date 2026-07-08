import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';

@Injectable()
export class PayoutsService {
  private stripe: Stripe | null;

  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
  }

  async createOnboardingLink(userId: string, refreshUrl: string, returnUrl: string) {
    if (!this.stripe) {
      return {
        url: 'https://dashboard.stripe.com/test/connect/accounts/overview',
      };
    }
    const user = await this.users.requireById(userId);
    let accountId = user.stripeConnectAccountId;
    if (!accountId) {
      const acct = await this.stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = acct.id;
      await this.users.setStripeConnectAccountId(userId, accountId);
    }
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || 'http://localhost:8081',
      return_url: returnUrl || 'http://localhost:8081',
      type: 'account_onboarding',
    });
    return { url: link.url };
  }

  async accountStatus(userId: string) {
    const user = await this.users.requireById(userId);
    if (!user.stripeConnectAccountId || !this.stripe) {
      return {
        onboarded: !!user.stripeConnectAccountId && !this.stripe,
        detailsSubmitted: !!user.stripeConnectAccountId && !this.stripe,
      };
    }
    const acct = await this.stripe.accounts.retrieve(user.stripeConnectAccountId);
    return {
      onboarded: acct.details_submitted === true,
      detailsSubmitted: acct.details_submitted === true,
      payoutsEnabled: acct.payouts_enabled === true,
    };
  }

  async summary(userId: string) {
    await this.users.requireById(userId);
    if (!this.stripe) {
      return { pendingAmount: 0, currency: 'cad', transfers: [] };
    }
    const user = await this.users.requireById(userId);
    if (!user.stripeConnectAccountId) {
      return { pendingAmount: 0, currency: 'cad', transfers: [] };
    }
    const balance = await this.stripe.balance.retrieve({
      stripeAccount: user.stripeConnectAccountId,
    });
    const pending =
      balance.pending?.find((b) => b.currency === 'cad')?.amount ?? 0;
    return {
      pendingAmount: pending / 100,
      currency: 'cad',
      transfers: [],
    };
  }
}
