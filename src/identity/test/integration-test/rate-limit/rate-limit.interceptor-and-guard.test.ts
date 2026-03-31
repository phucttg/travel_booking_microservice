import 'reflect-metadata';
import { CallHandler, ExecutionContext, ForbiddenException, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import configs from 'building-blocks/configs/configs';
import {
  createInternalAuthHeaders,
  resolveInternalServiceName
} from 'building-blocks/internal-auth/internal-auth.headers';
import { InternalOnly } from 'building-blocks/internal-auth/internal-only.decorator';
import { InternalOnlyGuard } from 'building-blocks/internal-auth/internal-only.guard';
import { RateLimitPolicy } from 'building-blocks/rate-limit/rate-limit.decorator';
import { RateLimitInterceptor } from 'building-blocks/rate-limit/rate-limit.interceptor';
import { RateLimitService } from 'building-blocks/rate-limit/rate-limit.service';
import {
  createMockRequest,
  createRateLimitDecision,
  createRateLimitDimensionResult,
  restoreRateLimitConfig,
  snapshotRateLimitConfig
} from '@tests/shared/rate-limit-test.helpers';

class IdentityController {
  login() {}

  @RateLimitPolicy('identity.validate.dynamic')
  validateAccessToken() {}
}

class BookingController {
  create() {}
}

class WalletController {
  payBooking() {}
}

class SeatController {
  @InternalOnly()
  @RateLimitPolicy('flight.seat_get_state.internal')
  getState() {}
}

class DebugController {
  unknownRoute() {}
}

type ResponseMock = {
  headers: Record<string, string>;
  setHeader: jest.Mock;
};

const createResponseMock = (): ResponseMock => {
  const headers: Record<string, string> = {};

  return {
    headers,
    setHeader: jest.fn((name: string, value: unknown) => {
      headers[name] = String(value);
    })
  };
};

const createContext = (params: {
  request: ReturnType<typeof createMockRequest>;
  response: ResponseMock;
  handler: (...args: any[]) => any;
  controller: Function;
}): ExecutionContext =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => params.request,
      getResponse: () => params.response
    }),
    getHandler: () => params.handler,
    getClass: () => params.controller
  }) as unknown as ExecutionContext;

const createNext = (): CallHandler =>
  ({
    handle: () => of({ ok: true })
  }) as CallHandler;

describe('rate-limit interceptor + internal-only guard (integration-style)', () => {
  let consumeMock: jest.Mock;
  let interceptor: RateLimitInterceptor;
  let guard: InternalOnlyGuard;
  let rateLimitConfigSnapshot: ReturnType<typeof snapshotRateLimitConfig>;

  beforeAll(() => {
    rateLimitConfigSnapshot = snapshotRateLimitConfig();
  });

  beforeEach(() => {
    consumeMock = jest.fn();
    interceptor = new RateLimitInterceptor(new Reflector(), {
      consume: (...args: unknown[]) => consumeMock(...args)
    } as RateLimitService);
    guard = new InternalOnlyGuard();

    configs.rateLimit.enabled = true;
    configs.rateLimit.mode = 'enforce';
    configs.rateLimit.headerEnabled = true;

    consumeMock.mockImplementation(async (input: any) => {
      const primaryDimension = input.resolvedPolicy.policy.dimensions[0];

      return createRateLimitDecision({
        policyId: input.resolvedPolicy.policy.id,
        source: input.resolvedPolicy.source,
        mode: 'enforce',
        allowed: true,
        wouldBlock: false,
        violated: undefined,
        results: [
          createRateLimitDimensionResult({
            id: primaryDimension?.id || 'ip',
            keyType: primaryDimension?.keyType || 'ip',
            key: '127.0.0.1',
            limit: primaryDimension?.limit || 100,
            windowSeconds: primaryDimension?.windowSeconds || 60,
            remaining: Math.max(0, (primaryDimension?.limit || 100) - 1),
            retryAfterSeconds: 0,
            allowed: true,
            skipped: false
          })
        ]
      });
    });
  });

  afterAll(() => {
    restoreRateLimitConfig(rateLimitConfigSnapshot);
  });

  it('returns 429 + rate-limit headers + payload fields for login when blocked', async () => {
    consumeMock.mockImplementation(async (input: any) => {
      if (input.resolvedPolicy.policy.id !== 'identity.login') {
        return createRateLimitDecision({
          policyId: input.resolvedPolicy.policy.id,
          source: input.resolvedPolicy.source,
          mode: 'enforce',
          allowed: true,
          wouldBlock: false,
          violated: undefined,
          results: [createRateLimitDimensionResult({ allowed: true, remaining: 10 })]
        });
      }

      return createRateLimitDecision(
        {
          policyId: 'identity.login',
          source: 'route',
          mode: 'enforce',
          allowed: false,
          wouldBlock: true
        },
        {
          id: 'ip',
          keyType: 'ip',
          limit: 12,
          windowSeconds: 60,
          remaining: 0,
          retryAfterSeconds: 7,
          resetUnixSeconds: 1_700_000_007,
          allowed: false,
          skipped: false
        }
      );
    });

    const request = createMockRequest({
      method: 'POST',
      baseUrl: '/api/v1/identity',
      route: { path: '/login' },
      originalUrl: '/api/v1/identity/login',
      ip: '203.0.113.1'
    });
    const response = createResponseMock();
    const context = createContext({
      request,
      response,
      handler: IdentityController.prototype.login,
      controller: IdentityController
    });

    try {
      await interceptor.intercept(context, createNext());
      fail('Expected HttpException 429');
    } catch (error) {
      const exception = error as HttpException;
      expect(exception.getStatus()).toBe(429);
      expect(exception.getResponse()).toEqual(
        expect.objectContaining({
          code: 'RATE_LIMIT_EXCEEDED',
          policyId: 'identity.login',
          dimension: 'ip',
          limit: 12,
          windowSeconds: 60,
          retryAfterSeconds: 7
        })
      );
    }

    expect(response.headers['X-RateLimit-Policy']).toBe('identity.login');
    expect(response.headers['X-RateLimit-Limit']).toBe('12');
    expect(response.headers['X-RateLimit-Remaining']).toBe('0');
    expect(response.headers['Retry-After']).toBe('7');
  });

  it('blocks booking/create by userId dimension', async () => {
    consumeMock.mockResolvedValueOnce(
      createRateLimitDecision(
        {
          policyId: 'booking.create',
          source: 'route',
          mode: 'enforce',
          allowed: false,
          wouldBlock: true
        },
        {
          id: 'userId',
          keyType: 'userId',
          limit: 15,
          windowSeconds: 60,
          remaining: 0,
          retryAfterSeconds: 9,
          allowed: false
        }
      )
    );

    const request = createMockRequest({
      method: 'POST',
      baseUrl: '/api/v1/booking',
      route: { path: '/create' },
      originalUrl: '/api/v1/booking/create',
      ip: '203.0.113.2',
      user: { userId: 7 }
    });
    const context = createContext({
      request,
      response: createResponseMock(),
      handler: BookingController.prototype.create,
      controller: BookingController
    });

    await expect(interceptor.intercept(context, createNext())).rejects.toMatchObject({
      status: 429,
      response: expect.objectContaining({
        policyId: 'booking.create',
        dimension: 'userId'
      })
    });
  });

  it('blocks wallet/pay-booking by paymentId dimension', async () => {
    consumeMock.mockResolvedValueOnce(
      createRateLimitDecision(
        {
          policyId: 'wallet.pay_booking',
          source: 'route',
          mode: 'enforce',
          allowed: false,
          wouldBlock: true
        },
        {
          id: 'paymentId',
          keyType: 'paymentId',
          limit: 10,
          windowSeconds: 60,
          remaining: 0,
          retryAfterSeconds: 11,
          allowed: false
        }
      )
    );

    const request = createMockRequest({
      method: 'POST',
      baseUrl: '/api/v1/wallet',
      route: { path: '/pay-booking' },
      originalUrl: '/api/v1/wallet/pay-booking',
      ip: '203.0.113.3',
      body: { paymentId: 999 }
    });
    const context = createContext({
      request,
      response: createResponseMock(),
      handler: WalletController.prototype.payBooking,
      controller: WalletController
    });

    await expect(interceptor.intercept(context, createNext())).rejects.toMatchObject({
      status: 429,
      response: expect.objectContaining({
        policyId: 'wallet.pay_booking',
        dimension: 'paymentId'
      })
    });
  });

  it('splits validate-access-token into external vs internal policy', async () => {
    const unsignedRequest = createMockRequest({
      method: 'POST',
      baseUrl: '/api/v1/identity',
      route: { path: '/validate-access-token' },
      originalUrl: '/api/v1/identity/validate-access-token',
      body: { accessToken: 'external-token' }
    });
    const unsignedContext = createContext({
      request: unsignedRequest,
      response: createResponseMock(),
      handler: IdentityController.prototype.validateAccessToken,
      controller: IdentityController
    });

    const unsignedResult = await interceptor.intercept(unsignedContext, createNext());
    await firstValueFrom(unsignedResult);

    const internalHeaders = createInternalAuthHeaders({
      secret: configs.internalAuth.secret,
      serviceName: resolveInternalServiceName('booking'),
      method: 'POST',
      path: '/api/v1/identity/validate-access-token'
    });

    const signedRequest = createMockRequest({
      method: 'POST',
      baseUrl: '/api/v1/identity',
      route: { path: '/validate-access-token' },
      originalUrl: '/api/v1/identity/validate-access-token',
      headers: internalHeaders,
      body: { accessToken: 'internal-token' }
    });
    const signedContext = createContext({
      request: signedRequest,
      response: createResponseMock(),
      handler: IdentityController.prototype.validateAccessToken,
      controller: IdentityController
    });

    const signedResult = await interceptor.intercept(signedContext, createNext());
    await firstValueFrom(signedResult);

    expect(consumeMock).toHaveBeenCalledTimes(2);

    const firstCallInput = consumeMock.mock.calls[0][0];
    const secondCallInput = consumeMock.mock.calls[1][0];

    expect(firstCallInput.resolvedPolicy.policy.id).toBe('identity.validate.external');
    expect(secondCallInput.resolvedPolicy.policy.id).toBe('identity.validate.internal');
    expect(secondCallInput.internalServiceName).toBe('booking');
  });

  it('enforces internal-only seat/get-state: unsigned throws 403, signed passes', async () => {
    const unsignedRequest = createMockRequest({
      method: 'GET',
      originalUrl: '/api/v1/seat/get-state?flightId=1&seatNumber=1A'
    });
    const unsignedContext = createContext({
      request: unsignedRequest,
      response: createResponseMock(),
      handler: SeatController.prototype.getState,
      controller: SeatController
    });

    try {
      guard.canActivate(unsignedContext);
      fail('Expected INTERNAL_ACCESS_ONLY forbidden exception');
    } catch (error) {
      expect((error as ForbiddenException).getResponse()).toEqual(
        expect.objectContaining({
          code: 'INTERNAL_ACCESS_ONLY'
        })
      );
    }

    const headers = createInternalAuthHeaders({
      secret: configs.internalAuth.secret,
      serviceName: resolveInternalServiceName('booking'),
      method: 'GET',
      path: '/api/v1/seat/get-state'
    });
    const signedRequest = createMockRequest({
      method: 'GET',
      baseUrl: '/api/v1/seat',
      route: { path: '/get-state' },
      originalUrl: '/api/v1/seat/get-state?flightId=1&seatNumber=1A',
      headers
    });
    const signedResponse = createResponseMock();
    const signedContext = createContext({
      request: signedRequest,
      response: signedResponse,
      handler: SeatController.prototype.getState,
      controller: SeatController
    });

    expect(guard.canActivate(signedContext)).toBe(true);

    const signedResult = await interceptor.intercept(signedContext, createNext());
    await firstValueFrom(signedResult);

    const lastCallInput = consumeMock.mock.calls.at(-1)?.[0];
    expect(lastCallInput.resolvedPolicy.policy.id).toBe('flight.seat_get_state.internal');
  });

  it('applies fallback.unknown policy for non-mapped routes', async () => {
    const request = createMockRequest({
      method: 'GET',
      baseUrl: '/api/v1/debug',
      route: { path: '/unknown-route' },
      originalUrl: '/api/v1/debug/unknown-route'
    });
    const context = createContext({
      request,
      response: createResponseMock(),
      handler: DebugController.prototype.unknownRoute,
      controller: DebugController
    });

    const result = await interceptor.intercept(context, createNext());
    await firstValueFrom(result);

    const lastCallInput = consumeMock.mock.calls.at(-1)?.[0];
    expect(lastCallInput.resolvedPolicy.policy.id).toBe('fallback.unknown');
    expect(lastCallInput.resolvedPolicy.source).toBe('fallback');
  });
});
