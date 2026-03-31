"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractIpFallbackKey = exports.extractRateLimitKey = void 0;
const crypto_1 = require("crypto");
const identity_contract_1 = require("../contracts/identity.contract");
const internal_auth_headers_1 = require("../internal-auth/internal-auth.headers");
const internal_auth_headers_2 = require("../internal-auth/internal-auth.headers");
const normalizeIp = (request) => {
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
const normalizePositiveInteger = (value) => {
    if (value === undefined || value === null) {
        return null;
    }
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue <= 0) {
        return null;
    }
    return String(numericValue);
};
const extractEmail = (request) => {
    const body = request.body;
    if (!body || typeof body !== 'object') {
        return null;
    }
    const email = body.email;
    if (typeof email !== 'string') {
        return null;
    }
    const normalized = email.trim().toLowerCase();
    return normalized || null;
};
const extractRefreshTokenHash = (request) => {
    const body = request.body;
    if (!body || typeof body !== 'object') {
        return null;
    }
    const refreshToken = body.refreshToken;
    if (typeof refreshToken !== 'string' || refreshToken.trim() === '') {
        return null;
    }
    return (0, crypto_1.createHash)('sha256').update(refreshToken).digest('hex');
};
const extractPaymentId = (request) => {
    const body = request.body;
    if (!body || typeof body !== 'object') {
        return null;
    }
    return normalizePositiveInteger(body.paymentId);
};
const extractRateLimitKey = (keyType, request, context = {}) => {
    const jwtRequest = request;
    switch (keyType) {
        case 'ip':
            return normalizeIp(request);
        case 'userId':
            return normalizePositiveInteger(jwtRequest.user?.userId);
        case 'adminUserId': {
            const role = Number(jwtRequest.user?.role);
            if (role !== identity_contract_1.Role.ADMIN) {
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
                return (0, internal_auth_headers_2.normalizeInternalServiceName)(context.internalServiceName);
            }
            if (jwtRequest.internalAuth?.serviceName) {
                return (0, internal_auth_headers_2.normalizeInternalServiceName)(jwtRequest.internalAuth.serviceName);
            }
            const rawServiceName = request.headers[internal_auth_headers_1.INTERNAL_SERVICE_NAME_HEADER];
            if (typeof rawServiceName === 'string' && rawServiceName.trim() !== '') {
                return (0, internal_auth_headers_2.normalizeInternalServiceName)(rawServiceName);
            }
            return null;
        }
        default:
            return null;
    }
};
exports.extractRateLimitKey = extractRateLimitKey;
const extractIpFallbackKey = (request) => normalizeIp(request);
exports.extractIpFallbackKey = extractIpFallbackKey;
//# sourceMappingURL=rate-limit.key-extractors.js.map