export type LimiterMode = 'shadow' | 'enforce';

export type RateLimitKeyType =
  | 'ip'
  | 'userId'
  | 'adminUserId'
  | 'email'
  | 'refreshTokenHash'
  | 'paymentId'
  | 'internalCaller';

export type RateLimitDimension = {
  id: string;
  keyType: RateLimitKeyType;
  limit: number;
  windowSeconds: number;
  fallbackToIp?: boolean;
};

export type RateLimitPolicy = {
  id: string;
  dimensions: RateLimitDimension[];
};

export type RateLimitDimensionResult = {
  id: string;
  keyType: RateLimitKeyType;
  key: string;
  limit: number;
  windowSeconds: number;
  remaining: number;
  retryAfterSeconds: number;
  resetUnixSeconds: number;
  allowed: boolean;
  skipped: boolean;
  fallbackToIp: boolean;
};

export type RateLimitDecision = {
  policyId: string;
  mode: LimiterMode;
  allowed: boolean;
  wouldBlock: boolean;
  degraded: boolean;
  source: 'metadata' | 'route' | 'fallback';
  results: RateLimitDimensionResult[];
  violated?: RateLimitDimensionResult;
};

export type ResolvedRateLimitPolicy = {
  policy: RateLimitPolicy;
  source: 'metadata' | 'route' | 'fallback';
};
