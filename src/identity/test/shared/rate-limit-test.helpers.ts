import { Request } from 'express';
import configs from 'building-blocks/configs/configs';
import { RateLimitDecision, RateLimitDimensionResult } from 'building-blocks/rate-limit/rate-limit.types';

type MockRequestInput = Partial<Request> & {
  headers?: Record<string, unknown>;
  user?: unknown;
  internalAuth?: unknown;
};

export const createMockRequest = (input: MockRequestInput = {}): Request => {
  const normalizedHeaders = Object.entries(input.headers || {}).reduce<Record<string, unknown>>(
    (accumulator, [key, value]) => {
      accumulator[key.toLowerCase()] = value;
      return accumulator;
    },
    {}
  );

  const request: any = {
    method: 'GET',
    baseUrl: '',
    url: '/',
    originalUrl: '/',
    path: '/',
    route: undefined,
    body: {},
    headers: normalizedHeaders,
    ips: [],
    ip: undefined,
    socket: {
      remoteAddress: '127.0.0.1'
    },
    ...input
  };

  request.headers = normalizedHeaders;

  request.header = (name: string) => {
    const value = normalizedHeaders[name.toLowerCase()];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value as string | undefined;
  };

  return request as Request;
};

export type RateLimitConfigSnapshot = {
  enabled: boolean;
  mode: 'shadow' | 'enforce';
  redisUrl: string;
  failOpen: boolean;
  headerEnabled: boolean;
  trustProxy: boolean;
};

export const snapshotRateLimitConfig = (): RateLimitConfigSnapshot => ({
  enabled: configs.rateLimit.enabled,
  mode: configs.rateLimit.mode,
  redisUrl: configs.rateLimit.redisUrl,
  failOpen: configs.rateLimit.failOpen,
  headerEnabled: configs.rateLimit.headerEnabled,
  trustProxy: configs.rateLimit.trustProxy
});

export const restoreRateLimitConfig = (snapshot: RateLimitConfigSnapshot): void => {
  configs.rateLimit.enabled = snapshot.enabled;
  configs.rateLimit.mode = snapshot.mode;
  configs.rateLimit.redisUrl = snapshot.redisUrl;
  configs.rateLimit.failOpen = snapshot.failOpen;
  configs.rateLimit.headerEnabled = snapshot.headerEnabled;
  configs.rateLimit.trustProxy = snapshot.trustProxy;
};

export const createRateLimitDimensionResult = (
  overrides: Partial<RateLimitDimensionResult> = {}
): RateLimitDimensionResult => ({
  id: 'ip',
  keyType: 'ip',
  key: '127.0.0.1',
  limit: 12,
  windowSeconds: 60,
  remaining: 0,
  retryAfterSeconds: 10,
  resetUnixSeconds: 1_700_000_010,
  allowed: overrides.allowed ?? false,
  skipped: false,
  fallbackToIp: false,
  ...overrides
});

export const createRateLimitDecision = (
  overrides: Partial<RateLimitDecision> = {},
  violatedDimensionOverrides: Partial<RateLimitDimensionResult> = {}
): RateLimitDecision => {
  const defaultViolated =
    overrides.wouldBlock === false
      ? undefined
      : createRateLimitDimensionResult({
          allowed: false,
          ...violatedDimensionOverrides
        });
  const violated = overrides.violated ?? defaultViolated;

  const results =
    overrides.results ||
    (violated
      ? [violated]
      : [
          createRateLimitDimensionResult({
            allowed: true,
            remaining: 1,
            retryAfterSeconds: 0
          })
        ]);
  const wouldBlock = overrides.wouldBlock ?? Boolean(violated);

  return {
    policyId: overrides.policyId || 'identity.login',
    mode: overrides.mode || 'enforce',
    allowed: overrides.allowed ?? !wouldBlock,
    wouldBlock,
    degraded: overrides.degraded ?? false,
    source: overrides.source || 'route',
    results,
    violated: overrides.violated ?? violated
  };
};
