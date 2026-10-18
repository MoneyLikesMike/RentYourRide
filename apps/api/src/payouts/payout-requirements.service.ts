import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { HostPayoutAccountsService } from './host-payout-accounts.service';
import { PayoutAccountsService, TosAcceptanceContext } from './payout-accounts.service';
import { isValidCanadianSin, normalizeSin } from './sin-luhn';
import { redactLogMessage } from './sensitive-log-redaction';

const DOC_MAX_BYTES = 10 * 1024 * 1024;
const DOC_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
]);

@Injectable()
export class PayoutRequirementsService {
  private readonly logger = new Logger(PayoutRequirementsService.name);
  private stripe: Stripe | null;

  constructor(
    private readonly config: ConfigService,
    private readonly hostAccounts: HostPayoutAccountsService,
    private readonly payoutAccounts: PayoutAccountsService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Payouts are not configured.');
    }
    return this.stripe;
  }

  async submitPersonal(
    userId: string,
    body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      region?: string;
      postalCode?: string;
    },
  ) {
    const row = await this.hostAccounts.requireCustomAccount(userId);
    const stripe = this.requireStripe();
    const individual: Stripe.AccountUpdateParams.Individual = {};
    if (body.firstName) individual.first_name = body.firstName;
    if (body.lastName) individual.last_name = body.lastName;
    if (body.email) individual.email = body.email;
    if (body.phone) individual.phone = body.phone;
    if (body.dateOfBirth) {
      const [year, month, day] = body.dateOfBirth.split('-').map(Number);
      individual.dob = { day, month, year };
    }
    if (
      body.addressLine1 ||
      body.city ||
      body.region ||
      body.postalCode
    ) {
      individual.address = {
        line1: body.addressLine1,
        line2: body.addressLine2 || undefined,
        city: body.city,
        state: body.region,
        postal_code: body.postalCode?.replace(/\s+/g, ''),
        country: 'CA',
      };
    }
    await stripe.accounts.update(row.stripeAccountId, { individual });
    await this.hostAccounts.syncAccount(row.stripeAccountId);
    return this.hostAccounts.accountStatusForUser(userId);
  }

  async submitSin(userId: string, sinRaw: string) {
    const row = await this.hostAccounts.requireCustomAccount(userId);
    const stripe = this.requireStripe();
    if (!isValidCanadianSin(sinRaw)) {
      throw new BadRequestException({
        field: 'sin',
        message: 'Enter a valid 9-digit Social Insurance Number.',
      });
    }
    const idNumber = normalizeSin(sinRaw);
    // Never log or persist the SIN — only send to Stripe.
    try {
      await stripe.accounts.update(row.stripeAccountId, {
        individual: { id_number: idNumber },
      });
    } catch (err) {
      this.logger.error(
        redactLogMessage(
          `SIN update failed for account ${row.stripeAccountId}: ${(err as Error)?.message}`,
        ),
      );
      throw err;
    }
    await this.hostAccounts.syncAccount(row.stripeAccountId);
    return this.hostAccounts.accountStatusForUser(userId);
  }

  async submitBank(
    userId: string,
    body: {
      accountNumber: string;
      transitNumber: string;
      institutionNumber: string;
      accountHolderName: string;
    },
  ) {
    const row = await this.hostAccounts.requireCustomAccount(userId);
    const stripe = this.requireStripe();
    const routing = `${body.transitNumber}-${body.institutionNumber}`;
    await this.payoutAccounts.replaceExternalAccount(stripe, row.stripeAccountId, {
      object: 'bank_account',
      country: 'CA',
      currency: 'cad',
      account_holder_name: body.accountHolderName,
      account_holder_type: 'individual',
      routing_number: routing,
      account_number: body.accountNumber,
    });
    await this.hostAccounts.syncAccount(row.stripeAccountId);
    return this.hostAccounts.accountStatusForUser(userId);
  }

  async submitTos(userId: string, tos: TosAcceptanceContext) {
    const row = await this.hostAccounts.requireCustomAccount(userId);
    const stripe = this.requireStripe();
    await stripe.accounts.update(row.stripeAccountId, {
      tos_acceptance: {
        date: Math.floor(tos.acceptedAt.getTime() / 1000),
        ip: tos.ip || '0.0.0.0',
        user_agent: tos.userAgent || undefined,
      },
    });
    await this.hostAccounts.syncAccount(row.stripeAccountId);
    return this.hostAccounts.accountStatusForUser(userId);
  }

  /**
   * Upload ID / address docs from memory buffer — never writes to disk or S3.
   */
  async submitDocument(
    userId: string,
    opts: {
      front: { buffer: Buffer; mimetype: string; originalname: string };
      back?: { buffer: Buffer; mimetype: string; originalname: string } | null;
      purpose: 'identity_document' | 'additional_verification';
    },
  ) {
    const row = await this.hostAccounts.requireCustomAccount(userId);
    const stripe = this.requireStripe();
    this.assertDoc(opts.front);
    if (opts.back) this.assertDoc(opts.back);

    const frontFile = await this.uploadStripeFile(
      stripe,
      row.stripeAccountId,
      opts.front,
      'identity_document',
    );
    let backFileId: string | undefined;
    if (opts.back) {
      const backFile = await this.uploadStripeFile(
        stripe,
        row.stripeAccountId,
        opts.back,
        'identity_document',
      );
      backFileId = backFile.id;
    }

    const doc: Stripe.AccountUpdateParams.Individual.Verification.Document = {
      front: frontFile.id,
    };
    if (backFileId) doc.back = backFileId;

    const individual: Stripe.AccountUpdateParams.Individual = {
      verification:
        opts.purpose === 'additional_verification'
          ? { additional_document: doc }
          : { document: doc },
    };

    this.logger.log(
      `Uploaded verification document for ${row.stripeAccountId} purpose=${opts.purpose} front=${frontFile.id}`,
    );

    await stripe.accounts.update(row.stripeAccountId, { individual });
    await this.hostAccounts.syncAccount(row.stripeAccountId);
    return this.hostAccounts.accountStatusForUser(userId);
  }

  private assertDoc(file: { buffer: Buffer; mimetype: string }) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Document file is required.');
    }
    if (file.buffer.length > DOC_MAX_BYTES) {
      throw new BadRequestException('Document must be 10 MB or smaller.');
    }
    const mime = String(file.mimetype || '').toLowerCase();
    if (!DOC_MIME.has(mime)) {
      throw new BadRequestException('Use a JPG, PNG, or PDF document.');
    }
  }

  async uploadStripeFile(
    stripe: Stripe,
    accountId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
    purpose: 'identity_document',
  ): Promise<Stripe.File> {
    // Memory buffer only — never write to disk/S3. Stripe Node SDK accepts Buffer.
    return stripe.files.create(
      {
        purpose,
        file: {
          data: file.buffer,
          name: file.originalname || 'document.jpg',
          type: file.mimetype as 'application/octet-stream',
        },
      },
      { stripeAccount: accountId },
    );
  }
}
