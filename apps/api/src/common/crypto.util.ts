import { createHash, randomBytes, randomInt } from 'crypto';

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
