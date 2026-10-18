/**
 * RYRA-489: shared refresh + session-expired handler.
 * Run: apps/api/node_modules/.bin/tsx --test services/apiClient.spec.js
 */

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { apiFetch, setOnSessionExpired, deps, __test } from './apiClient.js';

function jsonRes(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

describe('apiClient refresh', () => {
  beforeEach(() => {
    __test.reset();
    deps.getApiBaseUrl = () => 'https://api.test';
    deps.tokens = {
      getAccessToken: async () => 'expired-access',
      getRefreshToken: async () => 'refresh-1',
      setTokenPair: async () => {},
      clearTokens: async () => {},
    };
  });

  it('concurrent 401s refresh once', async () => {
    let refreshCalls = 0;
    let setPairCalls = 0;
    deps.tokens.setTokenPair = async () => {
      setPairCalls += 1;
    };
    deps.fetch = async (url, init) => {
      const u = String(url);
      if (u.includes('/v1/auth/refresh')) {
        refreshCalls += 1;
        await new Promise((r) => setTimeout(r, 25));
        return jsonRes(200, { accessToken: 'new-access', refreshToken: 'new-refresh' });
      }
      if ((init?.headers?.Authorization || '').includes('expired-access')) {
        return jsonRes(401, { message: 'Unauthorized' });
      }
      return jsonRes(200, { ok: true });
    };

    const [a, b] = await Promise.all([apiFetch('/v1/users/me'), apiFetch('/v1/bookings/1')]);
    assert.deepEqual(a, { ok: true });
    assert.deepEqual(b, { ok: true });
    assert.equal(refreshCalls, 1);
    assert.equal(setPairCalls, 1);
  });

  it('refresh rejection after 401 triggers onSessionExpired once', async () => {
    let expiredCalls = 0;
    setOnSessionExpired(() => {
      expiredCalls += 1;
    });

    deps.fetch = async (url) => {
      const u = String(url);
      if (u.includes('/v1/auth/refresh')) {
        return jsonRes(401, { message: 'Invalid refresh token' });
      }
      return jsonRes(401, { message: 'Unauthorized' });
    };

    await assert.rejects(
      () => apiFetch('/v1/users/me'),
      (err) => {
        assert.equal(err.status, 401);
        assert.equal(err.body?.code, 'SESSION_EXPIRED');
        assert.match(err.message, /session has expired/i);
        return true;
      },
    );
    assert.equal(expiredCalls, 1);
  });

  it('network refresh failure does not trigger onSessionExpired', async () => {
    let expiredCalls = 0;
    setOnSessionExpired(() => {
      expiredCalls += 1;
    });

    deps.fetch = async (url) => {
      const u = String(url);
      if (u.includes('/v1/auth/refresh')) {
        throw new Error('Network request failed');
      }
      return jsonRes(401, { message: 'Unauthorized' });
    };

    await assert.rejects(() => apiFetch('/v1/users/me'));
    assert.equal(expiredCalls, 0);
    assert.equal(__test.getLastRefreshFailure(), 'network');
  });
});
