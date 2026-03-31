import { Request } from 'express';
import { RuntimeHealthService } from '../health/runtime-health.service';
import { LimiterMode, RateLimitDecision, ResolvedRateLimitPolicy } from './rate-limit.types';
type ConsumeInput = {
    resolvedPolicy: ResolvedRateLimitPolicy;
    request: Request;
    mode?: LimiterMode;
    internalServiceName?: string;
};
export declare class RateLimitService {
    private readonly runtimeHealthService?;
    private readonly logger;
    private readonly redisClient;
    private readonly limiters;
    constructor(runtimeHealthService?: RuntimeHealthService);
    private markRedisState;
    private getLimiter;
    private ensureRedisConnected;
    private isRateLimiterRes;
    private getResetUnixSeconds;
    private buildSkippedDimensionResult;
    consume(input: ConsumeInput): Promise<RateLimitDecision>;
}
export {};
