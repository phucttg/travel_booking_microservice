"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RateLimitInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitInterceptor = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const configs_1 = __importDefault(require("../configs/configs"));
const internal_auth_service_1 = require("../internal-auth/internal-auth.service");
const rate_limit_decorator_1 = require("./rate-limit.decorator");
const rate_limit_policy_registry_1 = require("./rate-limit.policy-registry");
const rate_limit_service_1 = require("./rate-limit.service");
const VALIDATE_ACCESS_TOKEN_SIGNATURE = 'POST /api/v1/identity/validate-access-token';
let RateLimitInterceptor = RateLimitInterceptor_1 = class RateLimitInterceptor {
    reflector;
    rateLimitService;
    logger = new common_1.Logger(RateLimitInterceptor_1.name);
    internalAuthService = (0, internal_auth_service_1.getInternalAuthService)();
    constructor(reflector, rateLimitService) {
        this.reflector = reflector;
        this.rateLimitService = rateLimitService;
    }
    pickPrimaryDimension(decision) {
        if (decision.violated) {
            return decision.violated;
        }
        return decision.results.find((result) => !result.skipped) || decision.results[0];
    }
    applyRateLimitHeaders(response, decision) {
        const primaryDimension = this.pickPrimaryDimension(decision);
        response.setHeader('X-RateLimit-Policy', decision.policyId);
        if (!primaryDimension) {
            return;
        }
        response.setHeader('X-RateLimit-Limit', String(primaryDimension.limit));
        response.setHeader('X-RateLimit-Remaining', String(primaryDimension.remaining));
        response.setHeader('X-RateLimit-Reset', String(primaryDimension.resetUnixSeconds));
        if (decision.violated) {
            response.setHeader('Retry-After', String(primaryDimension.retryAfterSeconds));
        }
    }
    isValidateAccessTokenRoute(method, routePath) {
        return `${method.toUpperCase()} ${routePath}` === VALIDATE_ACCESS_TOKEN_SIGNATURE;
    }
    async intercept(context, next) {
        if (!configs_1.default.rateLimit.enabled || context.getType() !== 'http') {
            return next.handle();
        }
        const http = context.switchToHttp();
        const request = http.getRequest();
        const response = http.getResponse();
        if (!request || request.method.toUpperCase() === 'OPTIONS') {
            return next.handle();
        }
        const routePath = (0, rate_limit_policy_registry_1.resolveRequestRoutePath)(request);
        const method = request.method.toUpperCase();
        if (this.isValidateAccessTokenRoute(method, routePath) && !request.internalAuth) {
            request.internalAuth = this.internalAuthService.validateRequest(request);
        }
        const metadataPolicyId = this.reflector.getAllAndOverride(rate_limit_decorator_1.RATE_LIMIT_POLICY_METADATA_KEY, [
            context.getHandler(),
            context.getClass()
        ]);
        const resolvedPolicy = (0, rate_limit_policy_registry_1.resolveRateLimitPolicy)({
            request,
            method,
            routePath,
            metadataPolicyId,
            internalRequestValid: Boolean(request.internalAuth?.valid)
        });
        if (!resolvedPolicy) {
            return next.handle();
        }
        const decision = await this.rateLimitService.consume({
            resolvedPolicy,
            request,
            mode: configs_1.default.rateLimit.mode,
            internalServiceName: request.internalAuth?.serviceName
        });
        if (configs_1.default.rateLimit.headerEnabled) {
            this.applyRateLimitHeaders(response, decision);
        }
        if (decision.wouldBlock) {
            const violatedDimension = decision.violated || this.pickPrimaryDimension(decision);
            const retryAfterSeconds = violatedDimension?.retryAfterSeconds ?? 1;
            if (decision.mode === 'enforce') {
                response.setHeader('Retry-After', String(retryAfterSeconds));
                throw new common_1.HttpException({
                    code: 'RATE_LIMIT_EXCEEDED',
                    policyId: decision.policyId,
                    dimension: violatedDimension?.id,
                    limit: violatedDimension?.limit,
                    windowSeconds: violatedDimension?.windowSeconds,
                    retryAfterSeconds
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            this.logger.warn(`Rate limit shadow block for ${decision.policyId} on ${method} ${routePath} (${violatedDimension?.id || 'unknown'})`);
        }
        return next.handle();
    }
};
exports.RateLimitInterceptor = RateLimitInterceptor;
exports.RateLimitInterceptor = RateLimitInterceptor = RateLimitInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        rate_limit_service_1.RateLimitService])
], RateLimitInterceptor);
//# sourceMappingURL=rate-limit.interceptor.js.map