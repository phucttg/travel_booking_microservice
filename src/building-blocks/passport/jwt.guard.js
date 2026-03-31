"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtGuard = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const configs_1 = __importDefault(require("../configs/configs"));
const context_1 = require("../context/context");
const internal_auth_headers_1 = require("../internal-auth/internal-auth.headers");
let JwtGuard = class JwtGuard extends (0, passport_1.AuthGuard)('jwt') {
    async canActivate(context) {
        const canActivate = await super.canActivate(context);
        const request = context.switchToHttp().getRequest();
        const userId = Number(request.user?.userId);
        const token = this.extractToken(request);
        if (!token) {
            throw new common_1.UnauthorizedException('Missing bearer token');
        }
        if (configs_1.default.jwt.remoteIntrospectionEnabled) {
            await this.validateAccessToken(token);
        }
        if (Number.isInteger(userId) && userId > 0) {
            context_1.RequestContext.patch({ currentUserId: userId });
        }
        return Boolean(canActivate);
    }
    handleRequest(err, user, _info) {
        if (err || !user) {
            throw err || new common_1.UnauthorizedException();
        }
        return user;
    }
    extractToken(request) {
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
    async validateAccessToken(token) {
        const introspectionPath = '/api/v1/identity/validate-access-token';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const internalHeaders = configs_1.default.internalAuth.secret
            ? (0, internal_auth_headers_1.createInternalAuthHeaders)({
                secret: configs_1.default.internalAuth.secret,
                serviceName: (0, internal_auth_headers_1.resolveInternalServiceName)(configs_1.default.serviceName),
                method: 'POST',
                path: introspectionPath
            })
            : {};
        try {
            const response = await fetch(`${configs_1.default.identity.serviceBaseUrl.replace(/\/+$/, '')}${introspectionPath}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...internalHeaders
                },
                body: JSON.stringify({ accessToken: token }),
                signal: controller.signal
            });
            if (!response.ok) {
                throw new common_1.UnauthorizedException('Access token has been revoked or is invalid');
            }
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Unable to validate access token');
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
};
exports.JwtGuard = JwtGuard;
exports.JwtGuard = JwtGuard = __decorate([
    (0, common_1.Injectable)()
], JwtGuard);
//# sourceMappingURL=jwt.guard.js.map