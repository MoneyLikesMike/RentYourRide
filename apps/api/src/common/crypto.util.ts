import { createHash, randomBytes, randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';

/** PHP / legacy @node-rs bcrypt uses `$2y$`; node-bcrypt expects `$2a$` or `$2b$`. */
export function normalizeBcryptHash(hash: string): string {
  if (hash.startsWith('$2y$')) {
    return `$2a$${hash.slice(4)}`;
  }
  return hash;
}

export async function compareBcryptPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, normalizeBcryptHash(hash));
}

export function hashOpaque(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function randomRefreshToken(): string {
  return randomBytes(48).toString('hex');
}

export function randomResetToken(): string {
  return randomBytes(32).toString('hex');
}

export function randomReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const buf = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    out += chars[buf[i] % chars.length];
  }
  return out;
}

export function randomPhoneOtpCode(): string {
  return String(randomInt(100000, 1000000));
}
