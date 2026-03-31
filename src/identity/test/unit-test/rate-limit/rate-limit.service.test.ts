import configs from 'building-blocks/configs/configs';
import { RateLimitService } from 'building-blocks/rate-limit/rate-limit.service';
import { RateLimitDimension, ResolvedRateLimitPolicy } from 'building-blocks/rate-limit/rate-limit.types';
import {
  createMockRequest,
  restoreRateLimitConfig,
  snapshotRateLimitConfig
} from '@tests/shared/rate-limit-test.helpers';

type ServiceHarness = {
  service: RateLimitService;
  limiterByDimension: Map<string, jest.Mock>;
};

const buildResolvedPolicy = (policyId: string, dimensions: RateLimitDimension[]): ResolvedRateLimitPolicy => ({
  policy: {
    id: policyId,
    dimensions
  },
  source: 'route'
});

const createServiceHarness = (options: { redisConnected?: boolean } = {}): ServiceHarness => {
  const service = new RateLimitService();
  const limiterByDimension = new Map<string, jest.Mock>();

  jest
    .spyOn(service as unknown as { ensureRedisConnected: () => Promise<boolean> }, 'ensureRedisConnected')
    .mockResolvedValue(options.redisConnected ?? true);

  jest
    .spyOn(service as unknown as { getLimiter: (...args: any[]) => { consume: jest.Mock } }, 'getLimiter')
    .mockImplementation((policy, dimension: RateLimitDimension) => {
      const existing = limiterByDimension.get(dimension.id);
      if (existing) {
        return {
          consume: existing
        };
      }

      const consume = jest.fn().mockResolvedValue({
        remainingPoints: Math.max(0, dimension.limit - 1),
        msBeforeNext: 1_000
      });
      limiterByDimension.set(dimension.id, consume);

      return {
        consume
      };
    });

  return { service, limiterByDimension };
};

describe('RateLimitService', () => {
  let snapshot: ReturnType<typeof snapshotRateLimitConfig>;

  beforeEach(() => {
    snapshot = snapshotRateLimitConfig();
    configs.rateLimit.mode = 'enforce';
    configs.rateLimit.failOpen = true;
  });

  afterEach(() => {
    restoreRateLimitConfig(snapshot);
    jest.restoreAllMocks();
  });

  it('allows request for single dimension when limiter has remaining points', async () => {
    const harness = createServiceHarness();
    harness.limiterByDimension.set(
      'ip',
      jest.fn().mockResolvedValue({
        remainingPoints: 4,
        msBeforeNext: 12_000
      })
    );

    const decision = await harness.service.consume({
      resolvedPolicy: buildResolvedPolicy('test.single.allow', [
        {
          id: 'ip',
          keyType: 'ip',
          limit: 5,
          windowSeconds: 60
        }
      ]),
      request: createMockRequest({ ip: '10.0.0.1' })
    });

    expect(decision.allowed).toBe(true);
    expect(decision.wouldBlock).toBe(false);
    expect(decision.violated).toBeUndefined();
    expect(decision.results[0]).toEqual(
      expect.objectContaining({
        id: 'ip',
        remaining: 4,
        retryAfterSeconds: 12,
        allowed: true,
        skipped: false
      })
    );
  });

  it('blocks request in enforce mode when single dimension is exceeded', async () => {
    const harness = createServiceHarness();
    harness.limiterByDimension.set(
      'ip',
      jest.fn().mockRejectedValue({
        msBeforeNext: 3_000,
        remainingPoints: 0
      })
    );

    const decision = await harness.service.consume({
      resolvedPolicy: buildResolvedPolicy('test.single.block', [
        {
          id: 'ip',
          keyType: 'ip',
          limit: 1,
          windowSeconds: 60
        }
      ]),
      request: createMockRequest({ ip: '10.0.0.5' }),
      mode: 'enforce'
    });

    expect(decision.allowed).toBe(false);
    expect(decision.wouldBlock).toBe(true);
    expect(decision.violated).toEqual(
      expect.objectContaining({
        id: 'ip',
        retryAfterSeconds: 3,
        allowed: false
      })
    );
  });

  it('keeps the first violated dimension as primary when multiple dimensions are exceeded', async () => {
    const harness = createServiceHarness();
    harness.limiterByDimension.set(
      'userId',
      jest.fn().mockRejectedValue({
        msBeforeNext: 5_000,
        remainingPoints: 0
      })
    );
    harness.limiterByDimension.set(
      'ip',
      jest.fn().mockRejectedValue({
        msBeforeNext: 8_000,
        remainingPoints: 0
      })
    );

    const decision = await harness.service.consume({
      resolvedPolicy: buildResolvedPolicy('test.multi.block', [
        {
          id: 'userId',
          keyType: 'userId',
          limit: 10,
          windowSeconds: 60
        },
        {
          id: 'ip',
          keyType: 'ip',
          limit: 20,
          windowSeconds: 60
        }
      ]),
      request: createMockRequest({
        ip: '10.0.0.6',
        user: {
          userId: 321
        }
      })
    });

    expect(decision.wouldBlock).toBe(true);
    expect(decision.violated?.id).toBe('userId');
    expect(decision.results).toHaveLength(2);
    expect(decision.results[0].allowed).toBe(false);
    expect(decision.results[1].allowed).toBe(false);
  });

  it('computes retry-after and reset-unix-seconds from limiter result', async () => {
    const nowUnixSeconds = 1_700_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(nowUnixSeconds * 1000);

    const harness = createServiceHarness();
    harness.limiterByDimension.set(
      'ip',
      jest.fn().mockRejectedValue({
        msBeforeNext: 2_500,
        remainingPoints: 0
      })
    );

    const decision = await harness.service.consume({
      resolvedPolicy: buildResolvedPolicy('test.retry', [
        {
          id: 'ip',
          keyType: 'ip',
          limit: 1,
          windowSeconds: 60
        }
      ]),
      request: createMockRequest({ ip: '10.0.0.7' }),
      mode: 'enforce'
    });

    expect(decision.violated?.retryAfterSeconds).toBe(3);
    expect(decision.violated?.resetUnixSeconds).toBe(nowUnixSeconds + 3);
  });

  it('does not block in shadow mode even when limiter would block', async () => {
    const harness = createServiceHarness();
    harness.limiterByDimension.set(
      'ip',
      jest.fn().mockRejectedValue({
        msBeforeNext: 2_000,
        remainingPoints: 0
      })
    );

    const decision = await harness.service.consume({
      resolvedPolicy: buildResolvedPolicy('test.shadow', [
        {
          id: 'ip',
          keyType: 'ip',
          limit: 1,
          windowSeconds: 60
        }
      ]),
      request: createMockRequest({ ip: '10.0.0.8' }),
      mode: 'shadow'
    });

    expect(decision.wouldBlock).toBe(true);
    expect(decision.allowed).toBe(true);
    expect(decision.mode).toBe('shadow');
  });

  it('fails open and marks decision degraded when redis is unavailable', async () => {
    const harness = createServiceHarness({ redisConnected: false });

    const decision = await harness.service.consume({
      resolvedPolicy: buildResolvedPolicy('test.degraded', [
        {
          id: 'ip',
          keyType: 'ip',
          limit: 10,
          windowSeconds: 60
        },
        {
          id: 'userId',
          keyType: 'userId',
          limit: 15,
          windowSeconds: 60
        }
      ]),
      request: createMockRequest({
        ip: '10.0.0.9',
        user: {
          userId: 123
        }
      }),
      mode: 'enforce'
    });

    expect(decision.degraded).toBe(true);
    expect(decision.allowed).toBe(true);
    expect(decision.wouldBlock).toBe(false);
    expect(decision.results).toHaveLength(2);
    expect(decision.results.every((result) => result.skipped)).toBe(true);
    expect(decision.results.every((result) => result.key === 'degraded')).toBe(true);
  });

  it('falls back to ip key when primary key is missing and fallbackToIp=true', async () => {
    const harness = createServiceHarness();
    harness.limiterByDimension.set(
      'userId',
      jest.fn().mockResolvedValue({
        remainingPoints: 9,
        msBeforeNext: 6_000
      })
    );

    const decision = await harness.service.consume({
      resolvedPolicy: buildResolvedPolicy('test.fallback.ip', [
        {
          id: 'userId',
          keyType: 'userId',
          limit: 10,
          windowSeconds: 60,
          fallbackToIp: true
        }
      ]),
      request: createMockRequest({ ip: '203.0.113.5' })
    });

    expect(decision.allowed).toBe(true);
    expect(decision.results[0]).toEqual(
      expect.objectContaining({
        id: 'userId',
        key: '203.0.113.5',
        fallbackToIp: true,
        skipped: false
      })
    );
  });
});
