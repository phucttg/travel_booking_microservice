import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_POLICY_METADATA_KEY = 'rate_limit_policy_id';

export const RateLimitPolicy = (policyId: string) => SetMetadata(RATE_LIMIT_POLICY_METADATA_KEY, policyId);
