import { Injectable, Logger, Optional } from '@nestjs/common';
import { Request } from 'express';
import Redis from 'ioredis';
import * as Prometheus from 'prom-client';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import configs from '../configs/configs';
import { RuntimeHealthService } from '../health/runtime-health.service';
import { extractIpFallbackKey, extractRateLimitKey } from './rate-limit.key-extractors';
import {
  LimiterMode,
  RateLimitDecision,
  RateLimitDimension,
  RateLimitDimensionResult,
  RateLimitPolicy,
  ResolvedRateLimitPolicy
} from './rate-limit.types';

type ConsumeInput = {
  resolvedPolicy: ResolvedRateLimitPolicy;
  request: Request;
  mode?: LimiterMode;
  internalServiceName?: string;
};

const DECISION_COUNTER_NAME = 'rate_limit_decision_total';
const VIOLATION_COUNTER_NAME = 'rate_limit_violation_total';
const ERROR_COUNTER_NAME = 'rate_limit_error_total';

const getOrCreateCounter = (
  name: string,
  help: string,
  labelNames: string[]
): Prometheus.Counter<string> => {
  const existingMetric = Prometheus.register.getSingleMetric(name);

  if (existingMetric) {
    return existingMetric as Prometheus.Counter<string>;
  }

  return new Prometheus.Counter({
    name,
    help,
    labelNames
  });
};

const decisionCounter = getOrCreateCounter(DECISION_COUNTER_NAME, 'Rate limiter decisions', [
  'policy_id',
  'mode',
  'outcome'
]);
const violationCounter = getOrCreateCounter(VIOLATION_COUNTER_NAME, 'Rate limiter violations', [
  'policy_id',
  'dimension'
]);
const errorCounter = getOrCreateCounter(ERROR_COUNTER_NAME, 'Rate limiter errors', ['policy_id', 'reason']);

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly redisClient = new Redis(configs.rateLimit.redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1
  });
  private readonly limiters = new Map<string, RateLimiterRedis>();

  constructor(@Optional() private readonly runtimeHealthService?: RuntimeHealthService) {
    this.markRedisState('down', {
      message: 'Waiting for rate limiter Redis connection',
      redisStatus: this.redisClient.status
    });

    this.redisClient.on('connect', () => {
      this.markRedisState('degraded', {
        message: 'Rate limiter Redis socket connected',
        redisStatus: this.redisClient.status
      });
    });

    this.redisClient.on('ready', () => {
      this.markRedisState('up', {
        redisStatus: this.redisClient.status
      });
    });

    this.redisClient.on('close', () => {
      this.markRedisState('degraded', {
        message: 'Rate limiter Redis connection closed',
        redisStatus: this.redisClient.status
      });
    });

    this.redisClient.on('reconnecting', () => {
      this.markRedisState('degraded', {
        message: 'Rate limiter Redis reconnecting',
        redisStatus: this.redisClient.status
      });
    });

    this.redisClient.on('end', () => {
      this.markRedisState('down', {
        message: 'Rate limiter Redis connection ended',
        redisStatus: this.redisClient.status
      });
    });

    this.redisClient.on('error', (error) => {
      this.logger.warn(`Rate limiter Redis error: ${error?.message || error}`);
      this.markRedisState(configs.rateLimit.failOpen ? 'degraded' : 'down', {
        error: error instanceof Error ? error.message : String(error),
        redisStatus: this.redisClient.status
      });
    });
  }

  private markRedisState(
    state: 'up' | 'degraded' | 'down',
    details?: Record<string, unknown>
  ): void {
    this.runtimeHealthService?.setComponentStatus('redis-rate-limit', state, details);
  }

  private getLimiter(policy: RateLimitPolicy, dimension: RateLimitDimension): RateLimiterRedis {
    const limiterKey = `${policy.id}:${dimension.id}`;
    const existingLimiter = this.limiters.get(limiterKey);

    if (existingLimiter) {
      return existingLimiter;
    }

    const limiter = new RateLimiterRedis({
      storeClient: this.redisClient,
      keyPrefix: `rate-limit:${policy.id}:${dimension.id}`,
      points: dimension.limit,
      duration: dimension.windowSeconds,
      execEvenly: false
    });

    this.limiters.set(limiterKey, limiter);
    return limiter;
  }

  private async ensureRedisConnected(): Promise<boolean> {
    if (this.redisClient.status === 'ready') {
      this.markRedisState('up', {
        redisStatus: this.redisClient.status
      });
      return true;
    }

    if (this.redisClient.status === 'wait') {
      try {
        await this.redisClient.connect();
        this.markRedisState('up', {
          redisStatus: this.redisClient.status
        });
        return true;
      } catch (error) {
        this.logger.warn(`Rate limiter Redis connect failed: ${error?.message || error}`);
        this.markRedisState(configs.rateLimit.failOpen ? 'degraded' : 'down', {
          error: error instanceof Error ? error.message : String(error),
          redisStatus: this.redisClient.status
        });
        return false;
      }
    }

    this.markRedisState(configs.rateLimit.failOpen ? 'degraded' : 'down', {
      message: 'Rate limiter Redis is unavailable',
      redisStatus: this.redisClient.status
    });
    return false;
  }

  private isRateLimiterRes(error: unknown): error is RateLimiterRes {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as Record<string, unknown>;

    return typeof candidate.msBeforeNext === 'number';
  }

  private getResetUnixSeconds(retryAfterSeconds: number): number {
    const now = Math.ceil(Date.now() / 1000);
    return now + Math.max(0, retryAfterSeconds);
  }

  private buildSkippedDimensionResult(
    dimension: RateLimitDimension,
    key: string,
    fallbackToIp: boolean
  ): RateLimitDimensionResult {
    return {
      id: dimension.id,
      keyType: dimension.keyType,
      key,
      limit: dimension.limit,
      windowSeconds: dimension.windowSeconds,
      remaining: dimension.limit,
      retryAfterSeconds: 0,
      resetUnixSeconds: this.getResetUnixSeconds(dimension.windowSeconds),
      allowed: true,
      skipped: true,
      fallbackToIp
    };
  }

  public async consume(input: ConsumeInput): Promise<RateLimitDecision> {
    const mode = input.mode || configs.rateLimit.mode;
    const policy = input.resolvedPolicy.policy;
    const decisionSource = input.resolvedPolicy.source;

    const results: RateLimitDimensionResult[] = [];
    let violated: RateLimitDimensionResult | undefined;
    let degraded = false;

    const redisConnected = await this.ensureRedisConnected();

    if (!redisConnected && configs.rateLimit.failOpen) {
      degraded = true;
      this.markRedisState('degraded', {
        message: 'Rate limiter running fail-open because Redis is unavailable',
        redisStatus: this.redisClient.status
      });

      for (const dimension of policy.dimensions) {
        results.push(this.buildSkippedDimensionResult(dimension, 'degraded', false));
      }

      const decision: RateLimitDecision = {
        policyId: policy.id,
        mode,
        allowed: true,
        wouldBlock: false,
        degraded,
        source: decisionSource,
        results
      };

      decisionCounter.inc({ policy_id: decision.policyId, mode, outcome: 'degraded' });
      errorCounter.inc({ policy_id: policy.id, reason: 'redis_unavailable' });
      return decision;
    }

    for (const dimension of policy.dimensions) {
      let key = extractRateLimitKey(dimension.keyType, input.request, {
        internalServiceName: input.internalServiceName
      });
      let fallbackToIp = false;

      if (!key && dimension.fallbackToIp) {
        key = extractIpFallbackKey(input.request);
        fallbackToIp = true;
      }

      if (!key) {
        results.push(this.buildSkippedDimensionResult(dimension, 'missing-key', fallbackToIp));
        continue;
      }

      const limiter = this.getLimiter(policy, dimension);

      try {
        const response = await limiter.consume(key, 1);
        const retryAfterSeconds = Math.ceil((response.msBeforeNext || 0) / 1000);

        results.push({
          id: dimension.id,
          keyType: dimension.keyType,
          key,
          limit: dimension.limit,
          windowSeconds: dimension.windowSeconds,
          remaining: Math.max(0, Number(response.remainingPoints ?? 0)),
          retryAfterSeconds,
          resetUnixSeconds: this.getResetUnixSeconds(retryAfterSeconds),
          allowed: true,
          skipped: false,
          fallbackToIp
        });
      } catch (error) {
        if (this.isRateLimiterRes(error)) {
          const retryAfterSeconds = Math.ceil((error.msBeforeNext || 0) / 1000);

          const result: RateLimitDimensionResult = {
            id: dimension.id,
            keyType: dimension.keyType,
            key,
            limit: dimension.limit,
            windowSeconds: dimension.windowSeconds,
            remaining: Math.max(0, Number(error.remainingPoints ?? 0)),
            retryAfterSeconds,
            resetUnixSeconds: this.getResetUnixSeconds(retryAfterSeconds),
            allowed: false,
            skipped: false,
            fallbackToIp
          };

          results.push(result);

          if (!violated) {
            violated = result;
          }

          continue;
        }

        this.logger.warn(`Rate limiter consume error on ${policy.id}.${dimension.id}: ${error?.message || error}`);
        errorCounter.inc({ policy_id: policy.id, reason: 'consume_error' });
        this.markRedisState(configs.rateLimit.failOpen ? 'degraded' : 'down', {
          error: error instanceof Error ? error.message : String(error),
          policyId: policy.id,
          dimensionId: dimension.id,
          redisStatus: this.redisClient.status
        });

        if (configs.rateLimit.failOpen) {
          degraded = true;
          results.push(this.buildSkippedDimensionResult(dimension, key, fallbackToIp));
          continue;
        }

        const fallbackResult: RateLimitDimensionResult = {
          id: dimension.id,
          keyType: dimension.keyType,
          key,
          limit: dimension.limit,
          windowSeconds: dimension.windowSeconds,
          remaining: 0,
          retryAfterSeconds: 1,
          resetUnixSeconds: this.getResetUnixSeconds(1),
          allowed: false,
          skipped: false,
          fallbackToIp
        };

        results.push(fallbackResult);

        if (!violated) {
          violated = fallbackResult;
        }
      }
    }

    const wouldBlock = Boolean(violated);
    const allowed = mode === 'shadow' ? true : !wouldBlock;

    if (wouldBlock && violated) {
      violationCounter.inc({ policy_id: policy.id, dimension: violated.id });
    }

    const outcome = degraded
      ? 'degraded'
      : wouldBlock
        ? mode === 'shadow'
          ? 'shadow_block'
          : 'blocked'
        : 'allow';

    decisionCounter.inc({ policy_id: policy.id, mode, outcome });

    if (redisConnected && !degraded) {
      this.markRedisState('up', {
        redisStatus: this.redisClient.status
      });
    }

    return {
      policyId: policy.id,
      mode,
      allowed,
      wouldBlock,
      degraded,
      source: decisionSource,
      results,
      violated
    };
  }
}
