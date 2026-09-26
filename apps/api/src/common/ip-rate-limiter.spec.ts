import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpException } from '@nestjs/common';
import { albClientIp, IpRateLimiter } from './ip-rate-limiter';

describe('albClientIp', () => {
  it('uses the ALB-appended (last) X-Forwarded-For entry, not the forgeable first', () => {
    assert.equal(
      albClientIp({ headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' } }),
      '203.0.113.9',
    );
    assert.equal(albClientIp({ headers: {}, ip: '10.0.0.5' }), '10.0.0.5');
  });
});

describe('IpRateLimiter', () => {
  it('allows up to max hits per window, then 429s', () => {
    let t = 0;
    const limiter = new IpRateLimiter(3, 1000, 'slow down', () => t);
    limiter.hit('1.2.3.4');
    limiter.hit('1.2.3.4');
    limiter.hit('1.2.3.4');
    assert.throws(
      () => limiter.hit('1.2.3.4'),
      (err: unknown) => err instanceof HttpException && err.getStatus() === 429,
    );
    limiter.hit('5.6.7.8');
    t = 1001;
    limiter.hit('1.2.3.4');
  });

  it('ignores missing keys', () => {
    const limiter = new IpRateLimiter(1, 1000);
    limiter.hit(null);
    limiter.hit(null);
  });
});
