import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Client IP as seen by the ALB (client → ALB → Node, no other proxy). The ALB
 * appends the real peer address last; earlier X-Forwarded-For entries are
 * client-supplied and can be forged to dodge per-IP limits.
 */
export function albClientIp(req: {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string | null {
  const xf = req.headers?.['x-forwarded-for'];
  const raw = Array.isArray(xf) ? xf[xf.length - 1] : xf;
  if (typeof raw === 'string' && raw.trim()) {
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1].slice(0, 64);
  }
  const ip = req.ip || req.socket?.remoteAddress;
  return ip ? String(ip).slice(0, 64) : null;
}

/**
 * Rolling-window per-key limiter held in memory (single API instance), same
 * approach as PhoneOtpRateLimiter. Keys are usually client IPs.
 */
export class IpRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly message = 'Too many requests. Please try again later.',
    private readonly now: () => number = Date.now,
  ) {}

  /** Records a hit for `key`, throwing 429 once the window is full. */
  hit(key: string | null | undefined): void {
    if (!key) return;
    const now = this.now();
    if (this.hits.size > 10_000) this.sweep(now);
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      throw new HttpException(this.message, HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    this.hits.set(key, recent);
  }

  private sweep(now: number) {
    for (const [key, times] of this.hits) {
      if (!times.some((t) => now - t < this.windowMs)) this.hits.delete(key);
    }
  }
}
