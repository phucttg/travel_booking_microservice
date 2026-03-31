import { createHash } from 'crypto';
import { Role } from 'building-blocks/contracts/identity.contract';
import {
  extractIpFallbackKey,
  extractRateLimitKey
} from 'building-blocks/rate-limit/rate-limit.key-extractors';
import { INTERNAL_SERVICE_NAME_HEADER } from 'building-blocks/internal-auth/internal-auth.headers';
import { createMockRequest } from '@tests/shared/rate-limit-test.helpers';

describe('rate-limit key extractors', () => {
  it('extracts ip from request.ips first, then falls back to ip and forwarded-for', () => {
    const fromIps = createMockRequest({
      ips: ['10.0.0.1', '10.0.0.2'],
      ip: '10.0.0.9',
      headers: {
        'x-forwarded-for': '203.0.113.10, 203.0.113.11'
      }
    });
    const fromIp = createMockRequest({
      ip: '10.0.0.9',
      headers: {
        'x-forwarded-for': '203.0.113.10, 203.0.113.11'
      }
    });
    const fromForwarded = createMockRequest({
      headers: {
        'x-forwarded-for': '203.0.113.10, 203.0.113.11'
      }
    });

    expect(extractRateLimitKey('ip', fromIps)).toBe('10.0.0.1');
    expect(extractRateLimitKey('ip', fromIp)).toBe('10.0.0.9');
    expect(extractRateLimitKey('ip', fromForwarded)).toBe('203.0.113.10');
  });

  it('extracts userId and adminUserId only when role is admin', () => {
    const userRequest = createMockRequest({
      user: {
        userId: 88,
        role: Role.USER
      }
    });
    const adminRequest = createMockRequest({
      user: {
        userId: 99,
        role: Role.ADMIN
      }
    });

    expect(extractRateLimitKey('userId', userRequest)).toBe('88');
    expect(extractRateLimitKey('adminUserId', userRequest)).toBeNull();
    expect(extractRateLimitKey('adminUserId', adminRequest)).toBe('99');
  });

  it('normalizes email to lowercase + trimmed', () => {
    const request = createMockRequest({
      body: {
        email: '  USER@Example.COM  '
      }
    });

    expect(extractRateLimitKey('email', request)).toBe('user@example.com');
  });

  it('hashes refresh token with sha256', () => {
    const refreshToken = 'refresh-token-value';
    const request = createMockRequest({
      body: {
        refreshToken
      }
    });

    expect(extractRateLimitKey('refreshTokenHash', request)).toBe(
      createHash('sha256').update(refreshToken).digest('hex')
    );
  });

  it('extracts paymentId only for positive integers', () => {
    const valid = createMockRequest({
      body: {
        paymentId: 123
      }
    });
    const invalidZero = createMockRequest({
      body: {
        paymentId: 0
      }
    });

    expect(extractRateLimitKey('paymentId', valid)).toBe('123');
    expect(extractRateLimitKey('paymentId', invalidZero)).toBeNull();
  });

  it('extracts internal caller with priority context > internalAuth > header', () => {
    const request = createMockRequest({
      headers: {
        [INTERNAL_SERVICE_NAME_HEADER]: 'identity-service'
      },
      internalAuth: {
        valid: true,
        serviceName: 'booking service'
      }
    });

    expect(
      extractRateLimitKey('internalCaller', request, {
        internalServiceName: ' flight-service '
      })
    ).toBe('flight');

    expect(extractRateLimitKey('internalCaller', request)).toBe('booking');

    const headerOnly = createMockRequest({
      headers: {
        [INTERNAL_SERVICE_NAME_HEADER]: 'identity-service'
      }
    });
    expect(extractRateLimitKey('internalCaller', headerOnly)).toBe('identity');
  });

  it('returns ip fallback key consistently', () => {
    const request = createMockRequest({
      ip: '192.168.10.1'
    });

    expect(extractIpFallbackKey(request)).toBe('192.168.10.1');
  });
});
