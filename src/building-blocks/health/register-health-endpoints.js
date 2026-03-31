"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHealthEndpoints = registerHealthEndpoints;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const configs_1 = __importDefault(require("../configs/configs"));
const runtime_health_service_1 = require("./runtime-health.service");
const BACKEND_SERVICE_IDS = new Set(['identity', 'flight', 'passenger', 'booking', 'payment']);
const OUTBOX_SERVICE_IDS = new Set(['identity', 'booking', 'payment']);
const REMOTE_AUTH_SERVICE_IDS = new Set(['flight', 'passenger', 'booking', 'payment']);
const getAuthMode = () => configs_1.default.jwt.remoteIntrospectionEnabled ? 'remote-introspection' : 'offline-jwt';
const getExpectedComponentNames = () => {
    if (!BACKEND_SERVICE_IDS.has(configs_1.default.serviceId)) {
        return ['db'];
    }
    const componentNames = ['db', 'rabbitmq', 'redis-rate-limit'];
    if (OUTBOX_SERVICE_IDS.has(configs_1.default.serviceId)) {
        componentNames.push('outbox');
    }
    if (configs_1.default.jwt.remoteIntrospectionEnabled && REMOTE_AUTH_SERVICE_IDS.has(configs_1.default.serviceId)) {
        componentNames.push('identity-auth-dependency');
    }
    return componentNames;
};
const getRequiredComponentNames = () => {
    if (!BACKEND_SERVICE_IDS.has(configs_1.default.serviceId)) {
        return ['db'];
    }
    return getExpectedComponentNames().filter((componentName) => componentName !== 'redis-rate-limit');
};
const getDefaultComponentStatus = (message) => ({
    state: 'down',
    details: {
        message
    },
    updatedAt: new Date().toISOString()
});
function registerHealthEndpoints(app) {
    const runtimeHealthService = app.get(runtime_health_service_1.RuntimeHealthService);
    const dataSource = app.get(typeorm_1.DataSource, { strict: false });
    app.use('/health/live', (_request, response) => {
        response.status(200).json({
            service: configs_1.default.serviceName,
            status: 'alive',
            timestamp: new Date().toISOString()
        });
    });
    app.use('/health/ready', (_request, response) => {
        try {
            const dbReady = dataSource ? dataSource.isInitialized : true;
            const expectedComponentNames = getExpectedComponentNames();
            const runtimeComponents = runtimeHealthService.getComponentStatuses();
            const components = {
                db: {
                    state: dbReady ? 'up' : 'down',
                    updatedAt: new Date().toISOString()
                },
                ...runtimeComponents
            };
            for (const componentName of expectedComponentNames) {
                if (!components[componentName]) {
                    components[componentName] = getDefaultComponentStatus(`Missing runtime health signal for ${componentName}`);
                }
            }
            const requiredComponents = getRequiredComponentNames();
            const optionalComponents = expectedComponentNames.filter((componentName) => !requiredComponents.includes(componentName));
            const ready = requiredComponents.every((componentName) => components[componentName]?.state === 'up');
            const optionalHealthy = optionalComponents.every((componentName) => components[componentName]?.state === 'up');
            const state = ready ? (optionalHealthy ? 'ready' : 'degraded') : 'not_ready';
            response.status(ready ? 200 : 503).json({
                service: configs_1.default.serviceName,
                ready,
                state,
                authMode: getAuthMode(),
                requiredComponents,
                optionalComponents,
                timestamp: new Date().toISOString(),
                components
            });
        }
        catch (error) {
            common_1.Logger.error('Failed to compute readiness payload', error);
            response.status(503).json({
                service: configs_1.default.serviceName,
                ready: false,
                state: 'not_ready',
                timestamp: new Date().toISOString()
            });
        }
    });
}
//# sourceMappingURL=register-health-endpoints.js.map