import {
  BadGatewayException,
  BadRequestException,
  GoneException,
  Injectable,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { emailTypoUserMessage } from '../common/email-domain-typos';
import { UsersService } from '../users/users.service';
import { payoutRequirementsFromAccount } from './payout-account-status';
import {
  isCustomConnectAccount,
  isExpressConnectAccount,
} from './payout-accounts-kind';
import {
  PayoutAccountsService,
  TosAcceptanceContext,
} from './payout-accounts.service';
import { PayoutSetupDto } from './payout-setup.dto';
import { stripeParamToField } from './stripe-param-fields';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);
  private stripe: Stripe | null;

  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly accounts: PayoutAccountsService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
  }

  /**
   * @deprecated Express Account Links. Disabled with PAYOUT_ONBOARDING_LINK_ENABLED=0
   * (410) after Custom Get Paid ships; kept for older app builds while the flag is on.
   */
  async createOnboardingLink(userId: string, refreshUrl: string, returnUrl: string) {
    if (this.config.get<string>('PAYOUT_ONBOARDING_LINK_ENABLED') === '0') {
      throw new GoneException(
        'Stripe-hosted onboarding is no longer used. Complete payout setup in Get Paid.',
      );
    }
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

  /**
   * Save Get Paid form details onto a Custom Connect account (create or update).
   * TOS ip/user_agent must come from the request, never the body.
   */
  async submitPayoutDetails(
    userId: string,
    dto: PayoutSetupDto,
    tos: TosAcceptanceContext,
  ) {
    const typoMsg = emailTypoUserMessage(dto.email);
    if (typoMsg) throw new BadRequestException(typoMsg);

    if (dto.country !== 'CA' || dto.bankCountry !== 'CA') {
      throw new BadRequestException({
        field: 'country',
        message: 'Payout setup currently supports Canada only.',
      });
    }

    const user = await this.users.requireById(userId);
    if (!this.stripe) {
      return {
        status: 'verifying' as const,
        payoutsEnabled: false,
        detailsSubmitted: true,
        currentlyDue: [],
        pastDue: [],
        eventuallyDue: [],
        errors: [],
      };
    }

    try {
      let acct: Stripe.Account;

      if (!user.stripeConnectAccountId) {
        acct = await this.accounts.createCustomAccount(
          this.stripe,
          user,
          dto,
          tos,
        );
      } else {
        const existing = await this.stripe.accounts.retrieve(
          user.stripeConnectAccountId,
        );
        if (isCustomConnectAccount(existing)) {
          acct = await this.accounts.updateCustomAccount(
            this.stripe,
            existing.id,
            user,
            dto,
            tos,
          );
        } else if (isExpressConnectAccount(existing)) {
          this.accounts.migrateExpressHost(user);
        } else {
          throw new BadRequestException(
            'This payout account cannot be updated from Get Paid. Contact support.',
          );
        }
      }

      const retrieved = await this.stripe.accounts.retrieve(acct.id);
      return payoutRequirementsFromAccount(retrieved);
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof GoneException ||
        err instanceof NotImplementedException
      ) {
        throw err;
      }
      this.mapOrRethrowStripeError(err);
    }
  }

  private mapOrRethrowStripeError(err: unknown): never {
    const stripeError = err as Stripe.errors.StripeError;
    if (stripeError?.type === 'StripeInvalidRequestError' || stripeError?.rawType === 'invalid_request_error') {
      const field = stripeParamToField(stripeError.param);
      throw new BadRequestException({
        field: field ?? 'form',
        message: stripeError.message || 'Please check your payout details.',
      });
    }
    this.logger.error(
      `Payout setup Stripe error: ${stripeError?.message ?? err}`,
      stripeError?.stack,
    );
    throw new BadGatewayException(
      'We could not save your payout details right now. Please try again shortly.',
    );
  }

  async accountStatus(userId: string) {
    const user = await this.users.requireById(userId);
    if (!user.stripeConnectAccountId || !this.stripe) {
      return {
        ...payoutRequirementsFromAccount(null),
        onboarded: !!user.stripeConnectAccountId && !this.stripe,
        detailsSubmitted: !!user.stripeConnectAccountId && !this.stripe,
        payoutsEnabled: !!user.stripeConnectAccountId && !this.stripe,
      };
    }
    const acct = await this.stripe.accounts.retrieve(user.stripeConnectAccountId);
    const status = payoutRequirementsFromAccount(acct);
    return {
      ...status,
      onboarded: status.detailsSubmitted,
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
