import { createHash } from 'crypto';
import {
  DEFAULT_PRODUCT_DESCRIPTION,
  resolveBusinessProfileUrl,
} from './payout-business-profile';
import { PayoutSetupDto } from './payout-setup.dto';
import { RENTAL_MCC, toE164 } from './payout-shared';

export type TosAcceptanceContext = {
  ip: string | null;
  userAgent: string | null;
  acceptedAt: Date;
};

export function dtoHash(dto: PayoutSetupDto): string {
  const payload = JSON.stringify({
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
    dateOfBirth: dto.dateOfBirth,
    addressLine1: dto.addressLine1,
    addressLine2: dto.addressLine2 ?? '',
    city: dto.city,
    region: dto.region,
    postalCode: dto.postalCode,
    country: dto.country,
    phone: dto.phone,
    currency: dto.currency,
    bankCountry: dto.bankCountry,
    accountNumber: dto.accountNumber,
    transitNumber: dto.transitNumber ?? '',
    institutionNumber: dto.institutionNumber ?? '',
    routingNumber: dto.routingNumber ?? '',
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

/** Stripe accounts.create params for Custom Connect (RYRA-484). */
export function buildCustomAccountCreateParams(opts: {
  userId: string;
  email: string;
  dto: PayoutSetupDto;
  tos: TosAcceptanceContext;
  firstPublicListingId?: string | null;
  env?: { get: (key: string) => string | undefined };
  productDescription?: string;
}): {
  params: Record<string, unknown>;
  idempotencyKey: string;
} {
  const { userId, email, dto, tos } = opts;
  const [year, month, day] = dto.dateOfBirth.split('-').map(Number);
  const holderName = `${dto.firstName} ${dto.lastName}`.trim();
  const routingNumber = `${dto.transitNumber ?? ''}-${dto.institutionNumber ?? ''}`;
  const businessUrl = resolveBusinessProfileUrl({
    env: opts.env,
    firstPublicListingId: opts.firstPublicListingId ?? null,
  });

  return {
    idempotencyKey: `connect-create:${userId}:${dtoHash(dto)}`,
    params: {
      country: 'CA',
      business_type: 'individual',
      email,
      controller: {
        stripe_dashboard: { type: 'none' },
        fees: { payer: 'application' },
        losses: { payments: 'application' },
        requirement_collection: 'application',
      },
      capabilities: {
        transfers: { requested: true },
      },
      tos_acceptance: {
        date: Math.floor(tos.acceptedAt.getTime() / 1000),
        ip: tos.ip || '0.0.0.0',
        user_agent: tos.userAgent || undefined,
        service_agreement: 'full',
      },
      business_profile: {
        mcc: RENTAL_MCC,
        url: businessUrl,
        product_description:
          opts.productDescription ?? DEFAULT_PRODUCT_DESCRIPTION,
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
          country: 'CA',
        },
      },
      external_account: {
        object: 'bank_account',
        country: 'CA',
        currency: 'cad',
        account_holder_name: holderName,
        account_holder_type: 'individual',
        routing_number: routingNumber,
        account_number: dto.accountNumber,
      },
      metadata: { ryrUserId: userId },
    },
  };
}
