import {
  BadRequestException,
  Injectable,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Stripe from 'stripe';
import { ConnectTosAcceptanceEntity } from '../entities/connect-tos-acceptance.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import {
  DEFAULT_PRODUCT_DESCRIPTION,
  resolveBusinessProfileUrl,
} from './payout-business-profile';
import {
  buildCustomAccountCreateParams,
  type TosAcceptanceContext,
} from './payout-custom-create-params';
import { PayoutSetupDto } from './payout-setup.dto';
import {
  CONNECT_TOS_AGREEMENT_VERSION,
  RENTAL_MCC,
  toE164,
} from './payout-shared';

export type { TosAcceptanceContext };
export { CONNECT_TOS_AGREEMENT_VERSION, RENTAL_MCC, toE164 };
export {
  isCustomConnectAccount,
  isExpressConnectAccount,
} from './payout-accounts-kind';

@Injectable()
export class PayoutAccountsService {
  private readonly logger = new Logger(PayoutAccountsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(ConnectTosAcceptanceEntity)
    private readonly tosRepo: Repository<ConnectTosAcceptanceEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
  ) {}

  productDescription(dto: PayoutSetupDto): string {
    const allowClient =
      this.config.get<string>('PAYOUT_BUSINESS_DESCRIPTION_FROM_CLIENT') === '1';
    if (allowClient && dto.businessDescription?.trim()) {
      return dto.businessDescription.trim().slice(0, 600);
    }
    return DEFAULT_PRODUCT_DESCRIPTION;
  }

  async resolveBusinessUrl(userId: string): Promise<string> {
    // No public host profile route on the customer web app yet.
    const listing = await this.listings.findOne({
      where: { hostUserId: userId, active: true, published: true },
      order: { createdAt: 'ASC' },
      select: ['id'],
    });
    return resolveBusinessProfileUrl({
      env: this.config,
      firstPublicListingId: listing?.id ?? null,
    });
  }

  bankRoutingNumber(dto: PayoutSetupDto): string {
    const routingNumber =
      dto.bankCountry === 'CA'
        ? `${dto.transitNumber ?? ''}-${dto.institutionNumber ?? ''}`
        : (dto.routingNumber ?? '');
    if (routingNumber.replace(/\D/g, '').length < 3) {
      throw new BadRequestException({
        field: dto.bankCountry === 'CA' ? 'transitNumber' : 'routingNumber',
        message: 'Bank routing details are incomplete.',
      });
    }
    return routingNumber;
  }

  individualParams(dto: PayoutSetupDto): Stripe.AccountUpdateParams.Individual {
    const [year, month, day] = dto.dateOfBirth.split('-').map(Number);
    return {
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
        country: 'CA',
      },
    };
  }

  async createCustomAccount(
    stripe: Stripe,
    user: UserEntity,
    dto: PayoutSetupDto,
    tos: TosAcceptanceContext,
  ): Promise<Stripe.Account> {
    this.bankRoutingNumber(dto);
    const listing = await this.listings.findOne({
      where: { hostUserId: user.id, active: true, published: true },
      order: { createdAt: 'ASC' },
      select: ['id'],
    });
    const { params, idempotencyKey } = buildCustomAccountCreateParams({
      userId: user.id,
      email: dto.email || user.email,
      dto,
      tos,
      firstPublicListingId: listing?.id ?? null,
      env: this.config,
      productDescription: this.productDescription(dto),
    });

    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1::text))', [
        user.id,
      ]);

      // Re-read under the lock so a double-tap shares one account.
      const fresh = await manager.findOne(UserEntity, { where: { id: user.id } });
      if (fresh?.stripeConnectAccountId) {
        return stripe.accounts.retrieve(fresh.stripeConnectAccountId);
      }

      const acct = await stripe.accounts.create(
        params as Stripe.AccountCreateParams,
        { idempotencyKey },
      );

      await manager.update(UserEntity, { id: user.id }, {
        stripeConnectAccountId: acct.id,
      });

      const tosRow = manager.create(ConnectTosAcceptanceEntity, {
        userId: user.id,
        accountId: acct.id,
        acceptedAt: tos.acceptedAt,
        ip: tos.ip,
        userAgent: tos.userAgent?.slice(0, 512) ?? null,
        agreementVersion: CONNECT_TOS_AGREEMENT_VERSION,
      });
      await manager.save(tosRow);

      return acct;
    });
  }

  async updateCustomAccount(
    stripe: Stripe,
    accountId: string,
    user: UserEntity,
    dto: PayoutSetupDto,
    tos: TosAcceptanceContext,
  ): Promise<Stripe.Account> {
    const holderName = `${dto.firstName} ${dto.lastName}`.trim();
    const routingNumber = this.bankRoutingNumber(dto);
    const businessUrl = await this.resolveBusinessUrl(user.id);
    const productDescription = this.productDescription(dto);

    await stripe.accounts.update(accountId, {
      email: dto.email,
      business_type: 'individual',
      tos_acceptance: {
        date: Math.floor(tos.acceptedAt.getTime() / 1000),
        ip: tos.ip || '0.0.0.0',
        user_agent: tos.userAgent || undefined,
      },
      business_profile: {
        mcc: RENTAL_MCC,
        url: businessUrl,
        product_description: productDescription,
      },
      individual: this.individualParams(dto),
    });

    await this.replaceExternalAccount(stripe, accountId, {
      object: 'bank_account',
      country: 'CA',
      currency: 'cad',
      account_holder_name: holderName,
      account_holder_type: 'individual',
      routing_number: routingNumber,
      account_number: dto.accountNumber,
    });

    const tosRow = this.tosRepo.create({
      userId: user.id,
      accountId,
      acceptedAt: tos.acceptedAt,
      ip: tos.ip,
      userAgent: tos.userAgent?.slice(0, 512) ?? null,
      agreementVersion: CONNECT_TOS_AGREEMENT_VERSION,
    });
    await this.tosRepo.save(tosRow);

    return stripe.accounts.retrieve(accountId);
  }

  /**
   * Attach a new default bank account, then remove previous non-default
   * external accounts for that currency.
   */
  async replaceExternalAccount(
    stripe: Stripe,
    accountId: string,
    bank: {
      object: 'bank_account';
      country: string;
      currency: string;
      account_holder_name: string;
      account_holder_type: 'individual';
      routing_number: string;
      account_number: string;
    },
  ): Promise<void> {
    const created = await stripe.accounts.createExternalAccount(accountId, {
      external_account: bank,
      default_for_currency: true,
    });

    const list = await stripe.accounts.listExternalAccounts(accountId, {
      object: 'bank_account',
      limit: 20,
    });
    for (const ext of list.data) {
      if (ext.id === created.id) continue;
      try {
        await stripe.accounts.deleteExternalAccount(accountId, ext.id);
      } catch (err) {
        this.logger.warn(
          `Could not delete old external account ${ext.id} on ${accountId}: ${
            (err as Error)?.message ?? err
          }`,
        );
      }
    }
  }

  /**
   * RYRA-486 will move Express hosts onto Custom. Until then, refuse silently
   * converting an Express account.
   */
  migrateExpressHost(_user: UserEntity): never {
    throw new NotImplementedException(
      'Express Connect migration is not available yet. Contact support if you need help with payouts.',
    );
  }
}
