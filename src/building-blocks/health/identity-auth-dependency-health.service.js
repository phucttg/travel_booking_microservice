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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityAuthDependencyHealthService = void 0;
const common_1 = require("@nestjs/common");
const configs_1 = __importDefault(require("../configs/configs"));
const internal_auth_headers_1 = require("../internal-auth/internal-auth.headers");
const runtime_health_service_1 = require("./runtime-health.service");
const PROBE_PATH = '/api/v1/internal/health/auth-dependency';
let IdentityAuthDependencyHealthService = class IdentityAuthDependencyHealthService {
    runtimeHealthService;
    intervalRef;
    constructor(runtimeHealthService) {
        this.runtimeHealthService = runtimeHealthService;
    }
    onModuleInit() {
        if (!configs_1.default.jwt.remoteIntrospectionEnabled) {
            return;
        }
        this.runtimeHealthService.setComponentStatus('identity-auth-dependency', 'down', {
            message: 'Waiting for initial identity auth dependency probe'
        });
        this.intervalRef = setInterval(() => {
            void this.probeAsync();
        }, configs_1.default.health.authDependencyPollIntervalMs);
        void this.probeAsync();
    }
    onModuleDestroy() {
        if (this.intervalRef) {
            clearInterval(this.intervalRef);
        }
    }
    async probeAsync() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), configs_1.default.health.authDependencyTimeoutMs);
        const baseUrl = configs_1.default.identity.serviceBaseUrl.replace(/\/+$/, '');
        try {
            const response = await fetch(`${baseUrl}${PROBE_PATH}`, {
                method: 'GET',
                headers: this.createHeaders(),
                signal: controller.signal
            });
            if (!response.ok) {
                throw new Error(`Probe returned ${response.status}`);
            }
            this.runtimeHealthService.setComponentStatus('identity-auth-dependency', 'up', {
                statusCode: response.status,
                target: `${baseUrl}${PROBE_PATH}`
            });
        }
        catch (error) {
            this.runtimeHealthService.setComponentStatus('identity-auth-dependency', 'down', {
                error: error instanceof Error ? error.message : String(error),
                target: `${baseUrl}${PROBE_PATH}`
            });
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    createHeaders() {
        if (!configs_1.default.internalAuth.secret) {
            return {};
        }
        return (0, internal_auth_headers_1.createInternalAuthHeaders)({
            secret: configs_1.default.internalAuth.secret,
            serviceName: (0, internal_auth_headers_1.resolveInternalServiceName)(configs_1.default.serviceName),
            method: 'GET',
            path: PROBE_PATH
        });
    }
};
exports.IdentityAuthDependencyHealthService = IdentityAuthDependencyHealthService;
exports.IdentityAuthDependencyHealthService = IdentityAuthDependencyHealthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [runtime_health_service_1.RuntimeHealthService])
], IdentityAuthDependencyHealthService);
//# sourceMappingURL=identity-auth-dependency-health.service.js.map