import { BadRequestException } from '@nestjs/common';
import { isAllowedPhoneForOtp as isAllowedDestination } from './phone-otp-countries';

const WINDOW_MS = 60 * 60 * 1000;
/** Per authenticated user: max OTP sends per rolling hour. */
const MAX_PER_USER_PER_HOUR = 3;
/** Per destination number: max OTP sends per rolling hour. */
const MAX_PER_PHONE_PER_HOUR = 3;
/** Per client IP: max OTP sends per rolling hour (abuse / scripts). */
const MAX_PER_IP_PER_HOUR = 10;
/** Per authenticated user: max OTP sends per calendar day (UTC). */
const MAX_PER_USER_PER_DAY = 8;

type HitBucket = number[];

/**
 * In-memory OTP send limiter (single API instance). Enough to stop the
 * Sept 2026 international pump that burned the SNS monthly spend cap.
 */
export class PhoneOtpRateLimiter {
  private readonly byUser = new Map<string, HitBucket>();
  private readonly byPhone = new Map<string, HitBucket>();
  private readonly byIp = new Map<string, HitBucket>();
  private readonly byUserDay = new Map<string, { day: string; count: number }>();

  assertCanSend(opts: { userId: string; phoneE164: string; ip?: string | null }) {
    const now = Date.now();
    this.prune(this.byUser, opts.userId, now);
    this.prune(this.byPhone, opts.phoneE164, now);
    if (opts.ip) this.prune(this.byIp, opts.ip, now);

    if ((this.byUser.get(opts.userId)?.length ?? 0) >= MAX_PER_USER_PER_HOUR) {
      throw new BadRequestException(
        'Too many verification texts. Please wait up to an hour before trying again.',
      );
    }
    if ((this.byPhone.get(opts.phoneE164)?.length ?? 0) >= MAX_PER_PHONE_PER_HOUR) {
      throw new BadRequestException(
        'Too many verification texts to this number. Please wait up to an hour before trying again.',
      );
    }
    if (opts.ip && (this.byIp.get(opts.ip)?.length ?? 0) >= MAX_PER_IP_PER_HOUR) {
      throw new BadRequestException(
        'Too many verification texts from this network. Please wait up to an hour before trying again.',
      );
    }

    const day = new Date(now).toISOString().slice(0, 10);
    const dayRow = this.byUserDay.get(opts.userId);
    if (dayRow && dayRow.day === day && dayRow.count >= MAX_PER_USER_PER_DAY) {
      throw new BadRequestException(
        'Daily verification text limit reached. Try again tomorrow or contact support.',
      );
    }
  }

  recordSend(opts: { userId: string; phoneE164: string; ip?: string | null }) {
    const now = Date.now();
    this.push(this.byUser, opts.userId, now);
    this.push(this.byPhone, opts.phoneE164, now);
    if (opts.ip) this.push(this.byIp, opts.ip, now);

    const day = new Date(now).toISOString().slice(0, 10);
    const dayRow = this.byUserDay.get(opts.userId);
    if (!dayRow || dayRow.day !== day) {
      this.byUserDay.set(opts.userId, { day, count: 1 });
    } else {
      dayRow.count += 1;
    }
  }

  private push(map: Map<string, HitBucket>, key: string, now: number) {
    const hits = (map.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    hits.push(now);
    map.set(key, hits);
  }

  private prune(map: Map<string, HitBucket>, key: string, now: number) {
    const hits = (map.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (hits.length) map.set(key, hits);
    else map.delete(key);
  }
}

export const phoneOtpRateLimiter = new PhoneOtpRateLimiter();

/** Traveler / reasonable-cost destinations only (see phone-otp-countries.ts). */
export function isAllowedPhoneForOtp(e164: string): boolean {
  return isAllowedDestination(e164);
}

export function assertAllowedPhoneForOtp(e164: string): void {
  if (!isAllowedPhoneForOtp(e164)) {
    throw new BadRequestException(
      'Phone verification isn’t available for that country. Use a number from Canada, the US, or another supported country, or contact support.',
    );
  }
}

export function clientIpFromRequest(req: {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string | null {
  const xf = req.headers?.['x-forwarded-for'];
  const raw = Array.isArray(xf) ? xf[0] : xf;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',')[0].trim().slice(0, 64);
  }
  const ip = req.ip || req.socket?.remoteAddress;
  return ip ? String(ip).slice(0, 64) : null;
}
