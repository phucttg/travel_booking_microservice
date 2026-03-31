import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response, Request } from 'express';
import { Observable } from 'rxjs';
import configs from '../configs/configs';
import { getInternalAuthService } from '../internal-auth/internal-auth.service';
import { RATE_LIMIT_POLICY_METADATA_KEY } from './rate-limit.decorator';
import { resolveRateLimitPolicy, resolveRequestRoutePath } from './rate-limit.policy-registry';
import { RateLimitDecision, RateLimitDimensionResult } from './rate-limit.types';
import { RateLimitService } from './rate-limit.service';

type RequestWithInternalAuth = Request & {
  internalAuth?: {
    valid: boolean;
    serviceName?: string;
    reason?: string;
  };
};

const VALIDATE_ACCESS_TOKEN_SIGNATURE = 'POST /api/v1/identity/validate-access-token';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);
  private readonly internalAuthService = getInternalAuthService();

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService
  ) {}

  private pickPrimaryDimension(decision: RateLimitDecision): RateLimitDimensionResult | undefined {
    if (decision.violated) {
      return decision.violated;
    }

    return decision.results.find((result) => !result.skipped) || decision.results[0];
  }

  private applyRateLimitHeaders(response: Response, decision: RateLimitDecision): void {
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

  private isValidateAccessTokenRoute(method: string, routePath: string): boolean {
    return `${method.toUpperCase()} ${routePath}` === VALIDATE_ACCESS_TOKEN_SIGNATURE;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (!configs.rateLimit.enabled || context.getType<'http'>() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithInternalAuth>();
    const response = http.getResponse<Response>();

    if (!request || request.method.toUpperCase() === 'OPTIONS') {
      return next.handle();
    }

    const routePath = resolveRequestRoutePath(request);
    const method = request.method.toUpperCase();

    if (this.isValidateAccessTokenRoute(method, routePath) && !request.internalAuth) {
      request.internalAuth = this.internalAuthService.validateRequest(request);
    }

    const metadataPolicyId = this.reflector.getAllAndOverride<string>(RATE_LIMIT_POLICY_METADATA_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    const resolvedPolicy = resolveRateLimitPolicy({
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
      mode: configs.rateLimit.mode,
      internalServiceName: request.internalAuth?.serviceName
    });

    if (configs.rateLimit.headerEnabled) {
      this.applyRateLimitHeaders(response, decision);
    }

    if (decision.wouldBlock) {
      const violatedDimension = decision.violated || this.pickPrimaryDimension(decision);
      const retryAfterSeconds = violatedDimension?.retryAfterSeconds ?? 1;

      if (decision.mode === 'enforce') {
        response.setHeader('Retry-After', String(retryAfterSeconds));

        throw new HttpException(
          {
            code: 'RATE_LIMIT_EXCEEDED',
            policyId: decision.policyId,
            dimension: violatedDimension?.id,
            limit: violatedDimension?.limit,
            windowSeconds: violatedDimension?.windowSeconds,
            retryAfterSeconds
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      this.logger.warn(
        `Rate limit shadow block for ${decision.policyId} on ${method} ${routePath} (${violatedDimension?.id || 'unknown'})`
      );
    }

    return next.handle();
  }
}
