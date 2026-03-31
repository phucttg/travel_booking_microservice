import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { RateLimitService } from './rate-limit.service';
export declare class RateLimitInterceptor implements NestInterceptor {
    private readonly reflector;
    private readonly rateLimitService;
    private readonly logger;
    private readonly internalAuthService;
    constructor(reflector: Reflector, rateLimitService: RateLimitService);
    private pickPrimaryDimension;
    private applyRateLimitHeaders;
    private isValidateAccessTokenRoute;
    intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>>;
}
