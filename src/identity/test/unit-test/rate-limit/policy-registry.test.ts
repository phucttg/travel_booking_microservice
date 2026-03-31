import {
  resolveRateLimitPolicy,
  shouldBypassRateLimit
} from 'building-blocks/rate-limit/rate-limit.policy-registry';
import { createMockRequest } from '@tests/shared/rate-limit-test.helpers';

describe('rate-limit policy registry', () => {
  it('splits validate-access-token between internal and external policy', () => {
    const request = createMockRequest({
      method: 'POST',
      originalUrl: '/api/v1/identity/validate-access-token'
    });

    const internal = resolveRateLimitPolicy({
      request,
      method: 'POST',
      routePath: '/api/v1/identity/validate-access-token',
      metadataPolicyId: 'identity.validate.dynamic',
      internalRequestValid: true
    });
    const external = resolveRateLimitPolicy({
      request,
      method: 'POST',
      routePath: '/api/v1/identity/validate-access-token',
      metadataPolicyId: 'identity.validate.dynamic',
      internalRequestValid: false
    });

    expect(internal?.policy.id).toBe('identity.validate.internal');
    expect(external?.policy.id).toBe('identity.validate.external');
  });

  it('bypasses health, metrics and swagger routes', () => {
    expect(shouldBypassRateLimit('/health')).toBe(true);
    expect(shouldBypassRateLimit('/metrics/prometheus')).toBe(true);
    expect(shouldBypassRateLimit('/swagger/index.html')).toBe(true);

    const request = createMockRequest({
      method: 'GET',
      originalUrl: '/health'
    });

    const resolved = resolveRateLimitPolicy({
      request,
      method: 'GET',
      routePath: '/health',
      internalRequestValid: false
    });

    expect(resolved).toBeNull();
  });

  it('uses metadata policy when valid', () => {
    const request = createMockRequest({
      method: 'GET',
      originalUrl: '/api/v1/not-mapped'
    });

    const resolved = resolveRateLimitPolicy({
      request,
      method: 'GET',
      routePath: '/api/v1/not-mapped',
      metadataPolicyId: 'identity.login',
      internalRequestValid: false
    });

    expect(resolved?.policy.id).toBe('identity.login');
    expect(resolved?.source).toBe('metadata');
  });

  it('falls back to fallback.unknown when route is not mapped', () => {
    const request = createMockRequest({
      method: 'GET',
      originalUrl: '/api/v1/custom/unknown'
    });

    const resolved = resolveRateLimitPolicy({
      request,
      method: 'GET',
      routePath: '/api/v1/custom/unknown',
      internalRequestValid: false
    });

    expect(resolved?.policy.id).toBe('fallback.unknown');
    expect(resolved?.source).toBe('fallback');
  });
});
