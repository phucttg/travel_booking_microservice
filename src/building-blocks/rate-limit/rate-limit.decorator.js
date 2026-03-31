"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitPolicy = exports.RATE_LIMIT_POLICY_METADATA_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.RATE_LIMIT_POLICY_METADATA_KEY = 'rate_limit_policy_id';
const RateLimitPolicy = (policyId) => (0, common_1.SetMetadata)(exports.RATE_LIMIT_POLICY_METADATA_KEY, policyId);
exports.RateLimitPolicy = RateLimitPolicy;
//# sourceMappingURL=rate-limit.decorator.js.map