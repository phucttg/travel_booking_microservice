import configs from 'building-blocks/configs/configs';
import {
  createInternalAuthHeaders,
  INTERNAL_SIGNATURE_HEADER
} from 'building-blocks/internal-auth/internal-auth.headers';
import { InternalAuthService } from 'building-blocks/internal-auth/internal-auth.service';
import { createMockRequest } from '@tests/shared/rate-limit-test.helpers';

describe('InternalAuthService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns valid=true for a correct signed request', () => {
    const nowSeconds = 1_700_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(nowSeconds * 1000);

    const headers = createInternalAuthHeaders({
      secret: configs.internalAuth.secret,
      serviceName: 'identity',
      method: 'POST',
      path: '/api/v1/identity/validate-access-token',
      timestampSeconds: nowSeconds
    });

    const service = new InternalAuthService();
    const result = service.validateRequest(
      createMockRequest({
        method: 'POST',
        originalUrl: '/api/v1/identity/validate-access-token',
        headers
      })
    );

    expect(result).toEqual({
      valid: true,
      serviceName: 'identity'
    });
  });

  it('returns INVALID_SIGNATURE when signature does not match', () => {
    const nowSeconds = 1_700_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(nowSeconds * 1000);

    const headers = createInternalAuthHeaders({
      secret: configs.internalAuth.secret,
      serviceName: 'identity',
      method: 'POST',
      path: '/api/v1/identity/validate-access-token',
      timestampSeconds: nowSeconds
    });

    headers[INTERNAL_SIGNATURE_HEADER] = 'invalid-signature';

    const service = new InternalAuthService();
    const result = service.validateRequest(
      createMockRequest({
        method: 'POST',
        originalUrl: '/api/v1/identity/validate-access-token',
        headers
      })
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('INVALID_SIGNATURE');
    expect(result.serviceName).toBe('identity');
  });

  it('returns TIMESTAMP_OUT_OF_RANGE when timestamp is stale', () => {
    const nowSeconds = 1_700_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(nowSeconds * 1000);

    const staleTimestamp = nowSeconds - configs.internalAuth.maxClockSkewSeconds - 1;
    const headers = createInternalAuthHeaders({
      secret: configs.internalAuth.secret,
      serviceName: 'identity',
      method: 'POST',
      path: '/api/v1/identity/validate-access-token',
      timestampSeconds: staleTimestamp
    });

    const service = new InternalAuthService();
    const result = service.validateRequest(
      createMockRequest({
        method: 'POST',
        originalUrl: '/api/v1/identity/validate-access-token',
        headers
      })
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('TIMESTAMP_OUT_OF_RANGE');
    expect(result.serviceName).toBe('identity');
  });
});
