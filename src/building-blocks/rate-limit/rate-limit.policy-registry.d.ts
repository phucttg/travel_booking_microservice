import { Request } from 'express';
import { RateLimitPolicy, ResolvedRateLimitPolicy } from './rate-limit.types';
export declare const resolveRequestRoutePath: (request: Request) => string;
export declare const shouldBypassRateLimit: (routePath: string) => boolean;
export type ResolvePolicyInput = {
    request: Request;
    method: string;
    routePath: string;
    metadataPolicyId?: string;
    internalRequestValid: boolean;
};
export declare const resolveRateLimitPolicy: (input: ResolvePolicyInput) => ResolvedRateLimitPolicy | null;
export declare const getRateLimitPolicyById: (policyId: string) => RateLimitPolicy | null;
