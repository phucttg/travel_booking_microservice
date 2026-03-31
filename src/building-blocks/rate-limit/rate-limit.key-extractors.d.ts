import { Request } from 'express';
import { RateLimitKeyType } from './rate-limit.types';
export type KeyExtractorContext = {
    internalServiceName?: string;
};
export declare const extractRateLimitKey: (keyType: RateLimitKeyType, request: Request, context?: KeyExtractorContext) => string | null;
export declare const extractIpFallbackKey: (request: Request) => string | null;
