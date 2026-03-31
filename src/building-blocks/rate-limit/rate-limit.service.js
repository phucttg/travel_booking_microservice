"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RateLimitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const Prometheus = __importStar(require("prom-client"));
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const configs_1 = __importDefault(require("../configs/configs"));
const runtime_health_service_1 = require("../health/runtime-health.service");
const rate_limit_key_extractors_1 = require("./rate-limit.key-extractors");
const DECISION_COUNTER_NAME = 'rate_limit_decision_total';
const VIOLATION_COUNTER_NAME = 'rate_limit_violation_total';
const ERROR_COUNTER_NAME = 'rate_limit_error_total';
const getOrCreateCounter = (name, help, labelNames) => {
    const existingMetric = Prometheus.register.getSingleMetric(name);
    if (existingMetric) {
        return existingMetric;
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
let RateLimitService = RateLimitService_1 = class RateLimitService {
    runtimeHealthService;
    logger = new common_1.Logger(RateLimitService_1.name);
    redisClient = new ioredis_1.default(configs_1.default.rateLimit.redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1
    });
    limiters = new Map();
    constructor(runtimeHealthService) {
        this.runtimeHealthService = runtimeHealthService;
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
            this.markRedisState(configs_1.default.rateLimit.failOpen ? 'degraded' : 'down', {
                error: error instanceof Error ? error.message : String(error),
                redisStatus: this.redisClient.status
            });
        });
    }
    markRedisState(state, details) {
        this.runtimeHealthService?.setComponentStatus('redis-rate-limit', state, details);
    }
    getLimiter(policy, dimension) {
        const limiterKey = `${policy.id}:${dimension.id}`;
        const existingLimiter = this.limiters.get(limiterKey);
        if (existingLimiter) {
            return existingLimiter;
        }
        const limiter = new rate_limiter_flexible_1.RateLimiterRedis({
            storeClient: this.redisClient,
            keyPrefix: `rate-limit:${policy.id}:${dimension.id}`,
            points: dimension.limit,
            duration: dimension.windowSeconds,
            execEvenly: false
        });
        this.limiters.set(limiterKey, limiter);
        return limiter;
    }
    async ensureRedisConnected() {
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
            }
            catch (error) {
                this.logger.warn(`Rate limiter Redis connect failed: ${error?.message || error}`);
                this.markRedisState(configs_1.default.rateLimit.failOpen ? 'degraded' : 'down', {
                    error: error instanceof Error ? error.message : String(error),
                    redisStatus: this.redisClient.status
                });
                return false;
            }
        }
        this.markRedisState(configs_1.default.rateLimit.failOpen ? 'degraded' : 'down', {
            message: 'Rate limiter Redis is unavailable',
            redisStatus: this.redisClient.status
        });
        return false;
    }
    isRateLimiterRes(error) {
        if (!error || typeof error !== 'object') {
            return false;
        }
        const candidate = error;
        return typeof candidate.msBeforeNext === 'number';
    }
    getResetUnixSeconds(retryAfterSeconds) {
        const now = Math.ceil(Date.now() / 1000);
        return now + Math.max(0, retryAfterSeconds);
    }
    buildSkippedDimensionResult(dimension, key, fallbackToIp) {
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
    async consume(input) {
        const mode = input.mode || configs_1.default.rateLimit.mode;
        const policy = input.resolvedPolicy.policy;
        const decisionSource = input.resolvedPolicy.source;
        const results = [];
        let violated;
        let degraded = false;
        const redisConnected = await this.ensureRedisConnected();
        if (!redisConnected && configs_1.default.rateLimit.failOpen) {
            degraded = true;
            this.markRedisState('degraded', {
                message: 'Rate limiter running fail-open because Redis is unavailable',
                redisStatus: this.redisClient.status
            });
            for (const dimension of policy.dimensions) {
                results.push(this.buildSkippedDimensionResult(dimension, 'degraded', false));
            }
            const decision = {
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
            let key = (0, rate_limit_key_extractors_1.extractRateLimitKey)(dimension.keyType, input.request, {
                internalServiceName: input.internalServiceName
            });
            let fallbackToIp = false;
            if (!key && dimension.fallbackToIp) {
                key = (0, rate_limit_key_extractors_1.extractIpFallbackKey)(input.request);
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
            }
            catch (error) {
                if (this.isRateLimiterRes(error)) {
                    const retryAfterSeconds = Math.ceil((error.msBeforeNext || 0) / 1000);
                    const result = {
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
                this.markRedisState(configs_1.default.rateLimit.failOpen ? 'degraded' : 'down', {
                    error: error instanceof Error ? error.message : String(error),
                    policyId: policy.id,
                    dimensionId: dimension.id,
                    redisStatus: this.redisClient.status
                });
                if (configs_1.default.rateLimit.failOpen) {
                    degraded = true;
                    results.push(this.buildSkippedDimensionResult(dimension, key, fallbackToIp));
                    continue;
                }
                const fallbackResult = {
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
};
exports.RateLimitService = RateLimitService;
exports.RateLimitService = RateLimitService = RateLimitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [runtime_health_service_1.RuntimeHealthService])
], RateLimitService);
//# sourceMappingURL=rate-limit.service.js.map