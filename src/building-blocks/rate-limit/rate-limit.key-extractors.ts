import { createHash } from 'crypto';
import { Request } from 'express';
import { RateLimitKeyType } from './rate-limit.types';
import { Role } from '../contracts/identity.contract';
import { INTERNAL_SERVICE_NAME_HEADER } from '../internal-auth/internal-auth.headers';
import { normalizeInternalServiceName } from '../internal-auth/internal-auth.headers';

export type KeyExtractorContext = {
  internalServiceName?: string;
};

type JwtRequest = Request & {
  user?: {
    userId?: number | string;
    role?: number | string;
  };
  internalAuth?: {
    valid?: boolean;
    serviceName?: string;
  };
};

const normalizeIp = (request: Request): string | null => {
  if (Array.isArray(request.ips) && request.ips.length > 0) {
    return request.ips[0] || null;
  }

  if (typeof request.ip === 'string' && request.ip.trim() !== '') {
    return request.ip;
  }

  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim() !== '') {
    return forwardedFor.split(',')[0].trim();
  }

  if (request.socket?.remoteAddress) {
    return request.socket.remoteAddress;
  }

  return null;
};

const normalizePositiveInteger = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return String(numericValue);
};

const extractEmail = (request: Request): string | null => {
  const body = request.body;
  if (!body || typeof body !== 'object') {
    return null;
  }

  const email = (body as Record<string, unknown>).email;
  if (typeof email !== 'string') {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return normalized || null;
};

const extractRefreshTokenHash = (request: Request): string | null => {
  const body = request.body;
  if (!body || typeof body !== 'object') {
    return null;
  }

  const refreshToken = (body as Record<string, unknown>).refreshToken;
  if (typeof refreshToken !== 'string' || refreshToken.trim() === '') {
    return null;
  }

  return createHash('sha256').update(refreshToken).digest('hex');
};

const extractPaymentId = (request: Request): string | null => {
  const body = request.body;
  if (!body || typeof body !== 'object') {
    return null;
  }

  return normalizePositiveInteger((body as Record<string, unknown>).paymentId);
};

export const extractRateLimitKey = (
  keyType: RateLimitKeyType,
  request: Request,
  context: KeyExtractorContext = {}
): string | null => {
  const jwtRequest = request as JwtRequest;

  switch (keyType) {
    case 'ip':
      return normalizeIp(request);

    case 'userId':
      return normalizePositiveInteger(jwtRequest.user?.userId);

    case 'adminUserId': {
      const role = Number(jwtRequest.user?.role);
      if (role !== Role.ADMIN) {
        return null;
      }
      return normalizePositiveInteger(jwtRequest.user?.userId);
    }

    case 'email':
      return extractEmail(request);

    case 'refreshTokenHash':
      return extractRefreshTokenHash(request);

    case 'paymentId':
      return extractPaymentId(request);

    case 'internalCaller': {
      if (context.internalServiceName) {
        return normalizeInternalServiceName(context.internalServiceName);
      }

      if (jwtRequest.internalAuth?.serviceName) {
        return normalizeInternalServiceName(jwtRequest.internalAuth.serviceName);
      }

      const rawServiceName = request.headers[INTERNAL_SERVICE_NAME_HEADER];
      if (typeof rawServiceName === 'string' && rawServiceName.trim() !== '') {
        return normalizeInternalServiceName(rawServiceName);
      }

      return null;
    }

    default:
      return null;
  }
};

export const extractIpFallbackKey = (request: Request): string | null => normalizeIp(request);
