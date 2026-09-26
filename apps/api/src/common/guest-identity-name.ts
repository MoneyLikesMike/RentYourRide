import { UserEntity } from '../entities/user.entity';
import { IdentityNameParts } from './name-match';

/** Name used for payment-card vs license checks (license OCR first, then profile). */
export function guestIdentityNameParts(user: UserEntity): IdentityNameParts | null {
  const licenseFirst = user.licenseFirstName?.trim();
  const licenseLast = user.licenseLastName?.trim();
  if (licenseFirst && licenseLast) {
    return { firstName: licenseFirst, lastName: licenseLast };
  }
  if (user.licenseVerified) {
    const first = user.firstName?.trim();
    const last = user.lastName?.trim();
    if (first && last) return { firstName: first, lastName: last };
  }
  return null;
}
