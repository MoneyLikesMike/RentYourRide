import { ForbiddenException } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';

export type VerificationMissing = 'email' | 'phone' | 'license';

/** Email + phone + driver's license (Didit) — required to book or list. */
export function identityVerificationMissing(user: UserEntity): VerificationMissing[] {
  const missing: VerificationMissing[] = [];
  if (!user.emailVerified) missing.push('email');
  if (!user.phoneVerified) missing.push('phone');
  if (!user.licenseVerified) missing.push('license');
  return missing;
}

export function assertIdentityVerified(user: UserEntity): void {
  const missing = identityVerificationMissing(user);
  if (!missing.length) return;
  throw new ForbiddenException({
    code: 'VERIFICATION_INCOMPLETE',
    message:
      'Complete email, phone, and license verification before you can book or list a ride.',
    missing,
  });
}
