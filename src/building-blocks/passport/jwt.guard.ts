import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import configs from '../configs/configs';
import { RequestContext } from '../context/context';
import { createInternalAuthHeaders, resolveInternalServiceName } from '../internal-auth/internal-auth.headers';

type AuthenticatedRequest = Request & {
  user?: {
    userId?: number | string;
    token?: string;
  };
};

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = await super.canActivate(context);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = Number(request.user?.userId);
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    if (configs.jwt.remoteIntrospectionEnabled) {
      await this.validateAccessToken(token);
    }
    if (Number.isInteger(userId) && userId > 0) {
      RequestContext.patch({ currentUserId: userId });
    }

    return Boolean(canActivate);
  }

  handleRequest(err, user, _info) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const userToken = request.user?.token;

    if (typeof userToken === 'string' && userToken.trim() !== '') {
      return userToken;
    }

    const authorizationHeader = request.headers?.authorization;
    if (typeof authorizationHeader !== 'string') {
      return undefined;
    }

    const extractedToken = authorizationHeader.replace(/^Bearer\s+/i, '').trim();

    return extractedToken || undefined;
  }

  private async validateAccessToken(token: string): Promise<void> {
    const introspectionPath = '/api/v1/identity/validate-access-token';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const internalHeaders = configs.internalAuth.secret
      ? createInternalAuthHeaders({
          secret: configs.internalAuth.secret,
          serviceName: resolveInternalServiceName(configs.serviceName),
          method: 'POST',
          path: introspectionPath
        })
      : {};

    try {
      const response = await fetch(`${configs.identity.serviceBaseUrl.replace(/\/+$/, '')}${introspectionPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...internalHeaders
        },
        body: JSON.stringify({ accessToken: token }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new UnauthorizedException('Access token has been revoked or is invalid');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Unable to validate access token');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
