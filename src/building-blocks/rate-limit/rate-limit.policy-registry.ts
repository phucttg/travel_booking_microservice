import { Request } from 'express';
import { RateLimitPolicy, ResolvedRateLimitPolicy } from './rate-limit.types';

const dim = (
  id: string,
  keyType: RateLimitPolicy['dimensions'][number]['keyType'],
  limit: number,
  windowSeconds: number,
  fallbackToIp = false
) => ({
  id,
  keyType,
  limit,
  windowSeconds,
  fallbackToIp
});

const policies: Record<string, RateLimitPolicy> = {
  'identity.login': {
    id: 'identity.login',
    dimensions: [dim('ip', 'ip', 12, 60), dim('email', 'email', 25, 15 * 60)]
  },
  'identity.register': {
    id: 'identity.register',
    dimensions: [dim('ip', 'ip', 8, 10 * 60)]
  },
  'identity.refresh': {
    id: 'identity.refresh',
    dimensions: [dim('ip', 'ip', 120, 60), dim('refreshTokenHash', 'refreshTokenHash', 30, 60)]
  },
  'identity.validate.external': {
    id: 'identity.validate.external',
    dimensions: [dim('ip', 'ip', 120, 60)]
  },
  'identity.validate.internal': {
    id: 'identity.validate.internal',
    dimensions: [dim('internalCaller', 'internalCaller', 6000, 60)]
  },
  'booking.create': {
    id: 'booking.create',
    dimensions: [dim('userId', 'userId', 15, 60, true), dim('ip', 'ip', 60, 60)]
  },
  'payment.create_intent': {
    id: 'payment.create_intent',
    dimensions: [dim('userId', 'userId', 30, 60, true), dim('ip', 'ip', 120, 60)]
  },
  'wallet.pay_booking': {
    id: 'wallet.pay_booking',
    dimensions: [dim('userId', 'userId', 30, 60, true), dim('paymentId', 'paymentId', 10, 60)]
  },
  'wallet.topup_create': {
    id: 'wallet.topup_create',
    dimensions: [dim('userId', 'userId', 12, 60 * 60, true), dim('ip', 'ip', 60, 24 * 60 * 60)]
  },
  'payment.confirm_admin': {
    id: 'payment.confirm_admin',
    dimensions: [dim('adminUserId', 'adminUserId', 60, 60, true)]
  },
  'payment.reconcile_admin': {
    id: 'payment.reconcile_admin',
    dimensions: [dim('adminUserId', 'adminUserId', 60, 60, true)]
  },
  'flight.seat_get_state.internal': {
    id: 'flight.seat_get_state.internal',
    dimensions: [dim('internalCaller', 'internalCaller', 600, 60)]
  },
  'flight.seat_reserve': {
    id: 'flight.seat_reserve',
    dimensions: [dim('userId', 'userId', 60, 60, true), dim('ip', 'ip', 180, 60)]
  },
  'booking.cancel': {
    id: 'booking.cancel',
    dimensions: [dim('userId', 'userId', 30, 60, true)]
  },
  'booking.get_by_id': {
    id: 'booking.get_by_id',
    dimensions: [dim('userId', 'userId', 300, 60, true)]
  },
  'payment.get_by_id': {
    id: 'payment.get_by_id',
    dimensions: [dim('userId', 'userId', 300, 60, true)]
  },
  'read.authenticated.default': {
    id: 'read.authenticated.default',
    dimensions: [dim('userId', 'userId', 180, 60, true)]
  },
  'admin.write.default': {
    id: 'admin.write.default',
    dimensions: [dim('adminUserId', 'adminUserId', 60, 60, true)]
  },
  'fallback.unknown': {
    id: 'fallback.unknown',
    dimensions: [dim('ip', 'ip', 120, 60)]
  }
};

const endpointPolicy = new Map<string, string>([
  ['POST /api/v1/identity/login', 'identity.login'],
  ['POST /api/v1/identity/register', 'identity.register'],
  ['POST /api/v1/identity/refresh-token', 'identity.refresh'],
  ['POST /api/v1/identity/logout', 'read.authenticated.default'],

  ['GET /api/v1/user/me', 'read.authenticated.default'],
  ['GET /api/v1/user/get', 'read.authenticated.default'],
  ['GET /api/v1/user/get-by-id', 'read.authenticated.default'],
  ['POST /api/v1/user/create', 'admin.write.default'],
  ['PUT /api/v1/user/update/:id', 'admin.write.default'],
  ['DELETE /api/v1/user/delete', 'admin.write.default'],

  ['POST /api/v1/booking/create', 'booking.create'],
  ['PATCH /api/v1/booking/cancel/:id', 'booking.cancel'],
  ['GET /api/v1/booking/get-by-id', 'booking.get_by_id'],
  ['GET /api/v1/booking/get-all', 'read.authenticated.default'],

  ['POST /api/v1/payment/create-intent', 'payment.create_intent'],
  ['PATCH /api/v1/payment/confirm/:id', 'payment.confirm_admin'],
  ['POST /api/v1/payment/reconcile-manual', 'payment.reconcile_admin'],
  ['GET /api/v1/payment/get-by-id', 'payment.get_by_id'],
  ['GET /api/v1/payment/get-by-booking-id', 'read.authenticated.default'],
  ['POST /api/v1/payment/get-summaries-by-ids', 'read.authenticated.default'],

  ['GET /api/v1/wallet/me', 'read.authenticated.default'],
  ['POST /api/v1/wallet/topup-requests', 'wallet.topup_create'],
  ['GET /api/v1/wallet/topup-requests/my', 'read.authenticated.default'],
  ['GET /api/v1/wallet/topup-requests', 'read.authenticated.default'],
  ['PATCH /api/v1/wallet/topup-requests/:id/approve', 'admin.write.default'],
  ['PATCH /api/v1/wallet/topup-requests/:id/reject', 'admin.write.default'],
  ['POST /api/v1/wallet/pay-booking', 'wallet.pay_booking'],

  ['POST /api/v1/flight/create', 'admin.write.default'],
  ['GET /api/v1/flight/get-by-id', 'read.authenticated.default'],
  ['GET /api/v1/flight/get-all', 'read.authenticated.default'],

  ['POST /api/v1/airport/create', 'admin.write.default'],
  ['GET /api/v1/airport/get-by-id', 'read.authenticated.default'],
  ['GET /api/v1/airport/get-all', 'read.authenticated.default'],

  ['POST /api/v1/aircraft/create', 'admin.write.default'],
  ['GET /api/v1/aircraft/get-by-id', 'read.authenticated.default'],
  ['GET /api/v1/aircraft/get-all', 'read.authenticated.default'],

  ['POST /api/v1/seat/create', 'admin.write.default'],
  ['POST /api/v1/seat/reconcile-missing', 'admin.write.default'],
  ['GET /api/v1/seat/get-state', 'flight.seat_get_state.internal'],
  ['POST /api/v1/seat/reserve', 'flight.seat_reserve'],
  ['GET /api/v1/seat/get-available-seats', 'read.authenticated.default'],
  ['GET /api/v1/seat/get-by-flight-id', 'read.authenticated.default'],

  ['GET /api/v1/passenger/get-all', 'read.authenticated.default'],
  ['GET /api/v1/passenger/get-by-id', 'read.authenticated.default'],
  ['GET /api/v1/passenger/get-by-user-id', 'read.authenticated.default']
]);

const bypassPrefixes = ['/health', '/metrics', '/swagger'];
const validateAccessTokenRoute = 'POST /api/v1/identity/validate-access-token';
const dynamicValidatePolicyId = 'identity.validate.dynamic';

const normalizePath = (rawPath: string): string => {
  if (!rawPath) {
    return '/';
  }

  const collapsed = rawPath.replace(/\/+/g, '/');
  if (collapsed.length > 1 && collapsed.endsWith('/')) {
    return collapsed.slice(0, -1);
  }

  return collapsed;
};

export const resolveRequestRoutePath = (request: Request): string => {
  const baseUrl = request.baseUrl || '';
  const routePath = typeof request.route?.path === 'string' ? request.route.path : '';

  if (routePath) {
    const joinedPath = `${baseUrl}${routePath.startsWith('/') ? '' : '/'}${routePath}`;
    return normalizePath(joinedPath);
  }

  const rawUrl = request.originalUrl || request.url || '/';
  const pathOnly = rawUrl.split('?')[0] || '/';
  return normalizePath(pathOnly);
};

export const shouldBypassRateLimit = (routePath: string): boolean => {
  return bypassPrefixes.some((prefix) => routePath === prefix || routePath.startsWith(`${prefix}/`));
};

export type ResolvePolicyInput = {
  request: Request;
  method: string;
  routePath: string;
  metadataPolicyId?: string;
  internalRequestValid: boolean;
};

export const resolveRateLimitPolicy = (input: ResolvePolicyInput): ResolvedRateLimitPolicy | null => {
  const normalizedMethod = input.method.toUpperCase();
  const normalizedRoutePath = normalizePath(input.routePath);

  if (shouldBypassRateLimit(normalizedRoutePath)) {
    return null;
  }

  const routeSignature = `${normalizedMethod} ${normalizedRoutePath}`;

  if (
    input.metadataPolicyId === dynamicValidatePolicyId ||
    routeSignature === validateAccessTokenRoute
  ) {
    return {
      policy: input.internalRequestValid
        ? policies['identity.validate.internal']
        : policies['identity.validate.external'],
      source: 'route'
    };
  }

  if (input.metadataPolicyId && policies[input.metadataPolicyId]) {
    return {
      policy: policies[input.metadataPolicyId],
      source: 'metadata'
    };
  }

  const routePolicyId = endpointPolicy.get(routeSignature);
  if (routePolicyId) {
    return {
      policy: policies[routePolicyId],
      source: 'route'
    };
  }

  return {
    policy: policies['fallback.unknown'],
    source: 'fallback'
  };
};

export const getRateLimitPolicyById = (policyId: string): RateLimitPolicy | null => {
  return policies[policyId] ?? null;
};
