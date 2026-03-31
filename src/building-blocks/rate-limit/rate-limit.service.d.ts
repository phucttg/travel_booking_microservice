import { Request } from 'express';
import { LimiterMode, RateLimitDecision, ResolvedRateLimitPolicy } from './rate-limit.types';
type ConsumeInput = {
    resolvedPolicy: ResolvedRateLimitPolicy;
    request: Request;
    mode?: LimiterMode;
    internalServiceName?: string;
};
export declare class RateLimitService {
    private readonly logger;
    private readonly redisClient;
    private readonly limiters;
    constructor();
    private getLimiter;
    private ensureRedisConnected;
    private isRateLimiterRes;
    private getResetUnixSeconds;
    private buildSkippedDimensionResult;
    consume(input: ConsumeInput): Promise<RateLimitDecision>;
}
export {};
