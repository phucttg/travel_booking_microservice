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
const getAuthMode = () => configs_1.default.jwt.remoteIntrospectionEnabled ? 'remote-introspection' : 'offline-jwt';
function registerHealthEndpoints(app) {
    const runtimeHealthService = app.get(runtime_health_service_1.RuntimeHealthService);
    const dataSource = app.get(typeorm_1.DataSource, { strict: false });
    runtimeHealthService.setComponentStatus('authMode', 'up', {
        mode: getAuthMode()
    });
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
            const components = {
                db: {
                    state: dbReady ? 'up' : 'down',
                    updatedAt: new Date().toISOString()
                },
                ...runtimeHealthService.getComponentStatuses()
            };
            const componentStates = Object.values(components).map((component) => component.state);
            const state = !dbReady
                ? 'not_ready'
                : componentStates.every((componentState) => componentState === 'up')
                    ? 'ready'
                    : 'degraded';
            response.status(dbReady ? 200 : 503).json({
                service: configs_1.default.serviceName,
                ready: dbReady,
                state,
                authMode: getAuthMode(),
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