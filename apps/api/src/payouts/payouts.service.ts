import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';
import { PayoutSetupDto } from './payout-setup.dto';

/** Automobile rental — the merchant category Stripe expects for our hosts. */
const RENTAL_MCC = '7512';

/** Phone numbers come in as national digits; Stripe wants E.164. */
function toE164(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return raw.startsWith('+') ? raw : `+${digits}`;
}

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

  /**
   * Save the details from our own Get Paid form onto the host's Stripe account.
   * Stripe still owns terms acceptance and any identity documents it decides to
   * ask for, so the caller is handed a link only when something is still due.
   */
  async submitPayoutDetails(userId: string, dto: PayoutSetupDto) {
    const user = await this.users.requireById(userId);
    if (!this.stripe) {
      return {
        url: null,
        detailsSubmitted: true,
        payoutsEnabled: false,
        requiresOnboarding: false,
      };
    }

    const holderName = `${dto.firstName} ${dto.lastName}`.trim();
    const [year, month, day] = dto.dateOfBirth.split('-').map(Number);

    let accountId = user.stripeConnectAccountId;
    if (!accountId) {
      const acct = await this.stripe.accounts.create({
        type: 'express',
        country: dto.country,
        email: dto.email || user.email,
        business_type: 'individual',
        capabilities: { transfers: { requested: true } },
      });
      accountId = acct.id;
      await this.users.setStripeConnectAccountId(userId, accountId);
    }

    try {
      await this.stripe.accounts.update(accountId, {
        email: dto.email,
        business_type: 'individual',
        business_profile: {
          mcc: RENTAL_MCC,
          product_description:
            dto.businessDescription ||
            'Renting my personal vehicle to guests through RentYourRide.',
        },
        individual: {
          first_name: dto.firstName,
          last_name: dto.lastName,
          email: dto.email,
          phone: toE164(dto.phone),
          dob: { day, month, year },
          address: {
            line1: dto.addressLine1,
            line2: dto.addressLine2 || undefined,
            city: dto.city,
            state: dto.region,
            postal_code: dto.postalCode.replace(/\s+/g, ''),
            country: dto.country,
          },
        },
      });

      const routingNumber =
        dto.bankCountry === 'CA'
          ? `${dto.transitNumber ?? ''}-${dto.institutionNumber ?? ''}`
          : (dto.routingNumber ?? '');
      if (routingNumber.replace(/\D/g, '').length < 3) {
        throw new BadRequestException('Bank routing details are incomplete.');
      }

      await this.stripe.accounts.createExternalAccount(accountId, {
        external_account: {
          object: 'bank_account',
          country: dto.bankCountry,
          currency: dto.currency.toLowerCase(),
          account_holder_name: holderName,
          account_holder_type: 'individual',
          routing_number: routingNumber,
          account_number: dto.accountNumber,
        },
        default_for_currency: true,
      });
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const stripeError = err as Stripe.errors.StripeError;
      // Bad bank numbers are worth stopping for — the host can fix those here.
      // Anything else (already-attached account, or an account Stripe has
      // locked for API edits) falls through so they can finish on Stripe.
      const param = stripeError?.param ?? '';
      const isBankFieldProblem =
        stripeError?.code !== 'bank_account_exists' &&
        /account_number|routing_number|external_account/.test(param);
      if (isBankFieldProblem) {
        throw new BadRequestException(
          stripeError?.message || 'Please check your bank details.',
        );
      }
    }

    const acct = await this.stripe.accounts.retrieve(accountId);
    const requiresOnboarding = acct.details_submitted !== true;
    let url: string | null = null;
    if (requiresOnboarding) {
      const link = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: dto.refreshUrl || 'http://localhost:5173',
        return_url: dto.returnUrl || 'http://localhost:5173',
        type: 'account_onboarding',
      });
      url = link.url;
    }

    return {
      url,
      detailsSubmitted: acct.details_submitted === true,
      payoutsEnabled: acct.payouts_enabled === true,
      requiresOnboarding,
    };
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
