/**
 * RYRA-489: refresh-token grace window.
 * Run: npx tsx --test src/auth/auth-refresh.spec.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService, REFRESH_GRACE_MS } from './auth.service';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { UserEntity } from '../entities/user.entity';
import { hashOpaque } from '../common/crypto.util';

describe('AuthService.refresh grace window', () => {
  function harness(opts: { rotatedAt?: Date | null; expiresAt?: Date } = {}) {
    const user = new UserEntity();
    user.id = 'user-1';
    user.email = 'a@example.com';
    user.role = 'user';
    user.isActive = true;
    user.deletedAt = null;

    const plain = 'refresh-plain-token';
    const row = new RefreshTokenEntity();
    row.id = 'rt-1';
    row.userId = user.id;
    row.user = user;
    row.tokenHash = hashOpaque(plain);
    row.expiresAt = opts.expiresAt ?? new Date(Date.now() + 86_400_000);
    row.rotatedAt = opts.rotatedAt === undefined ? null : opts.rotatedAt;

    const saved: RefreshTokenEntity[] = [];
    const deletedWhere: unknown[] = [];

    const refreshRepo = {
      findOne: async () => row,
      save: async (entity: RefreshTokenEntity) => {
        saved.push(entity);
        if (entity.id === row.id) {
          row.rotatedAt = entity.rotatedAt;
        }
        return entity;
      },
      delete: async () => undefined,
      create: (data: Partial<RefreshTokenEntity>) => {
        const next = new RefreshTokenEntity();
        Object.assign(next, data);
        next.id = `rt-${saved.length + 2}`;
        return next;
      },
      createQueryBuilder: () => {
        const qb = {
          delete: () => qb,
          from: () => qb,
          where: (...args: unknown[]) => {
            deletedWhere.push(args);
            return qb;
          },
          orWhere: (...args: unknown[]) => {
            deletedWhere.push(args);
            return qb;
          },
          execute: async () => ({ affected: 0 }),
        };
        return qb;
      },
    };

    const jwt = {
      signAsync: async () => 'access-token',
    };

    const service = new AuthService(
      {} as never,
      refreshRepo as never,
      {} as never,
      {} as never,
      jwt as never,
      { get: () => 'test-secret' } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    return { service, plain, row, saved, deletedWhere };
  }

  it('double refresh within 60s both succeed', async () => {
    const { service, plain, row } = harness();
    const first = await service.refresh(plain);
    assert.ok(first.accessToken);
    assert.ok(first.refreshToken);
    assert.ok(row.rotatedAt instanceof Date);

    const second = await service.refresh(plain);
    assert.ok(second.accessToken);
    assert.ok(second.refreshToken);
    assert.notEqual(first.refreshToken, second.refreshToken);
  });

  it('reuse after grace window fails', async () => {
    const rotatedAt = new Date(Date.now() - REFRESH_GRACE_MS - 1_000);
    const { service, plain } = harness({ rotatedAt });
    await assert.rejects(
      () => service.refresh(plain),
      (err: unknown) => err instanceof UnauthorizedException,
    );
  });
});
