import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Host payout details collected by our own Get Paid form (app GetPaidStep1–3).
 * Used to prefill the Stripe Connect account so Stripe's hosted onboarding only
 * has to collect what we can't (terms acceptance and any extra verification).
 */
export class PayoutSetupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  email: string;

  /** ISO date, e.g. 1990-07-24. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD' })
  dateOfBirth: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  addressLine1: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  /** Two-letter province/state code, e.g. MB or CA. */
  @Matches(/^[A-Z]{2}$/, { message: 'region must be a 2-letter code' })
  region: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  postalCode: string;

  @IsIn(['CA', 'US'])
  country: 'CA' | 'US';

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  businessDescription?: string;

  @IsIn(['CAD', 'USD'])
  currency: 'CAD' | 'USD';

  @IsIn(['CA', 'US'])
  bankCountry: 'CA' | 'US';

  @Matches(/^\d{4,17}$/, { message: 'accountNumber must be 4-17 digits' })
  accountNumber: string;

  /** Canada only. */
  @IsOptional()
  @Matches(/^\d{5}$/, { message: 'transitNumber must be 5 digits' })
  transitNumber?: string;

  /** Canada only. */
  @IsOptional()
  @Matches(/^\d{3}$/, { message: 'institutionNumber must be 3 digits' })
  institutionNumber?: string;

  /** United States only. */
  @IsOptional()
  @Matches(/^\d{9}$/, { message: 'routingNumber must be 9 digits' })
  routingNumber?: string;

  @IsOptional()
  @IsString()
  refreshUrl?: string;

  @IsOptional()
  @IsString()
  returnUrl?: string;
}
