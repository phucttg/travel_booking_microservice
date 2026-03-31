import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import configs from '../configs/configs';
import { RuntimeComponentStatus, RuntimeHealthService } from './runtime-health.service';

const BACKEND_SERVICE_IDS = new Set(['identity', 'flight', 'passenger', 'booking', 'payment']);
const OUTBOX_SERVICE_IDS = new Set(['identity', 'booking', 'payment']);
const REMOTE_AUTH_SERVICE_IDS = new Set(['flight', 'passenger', 'booking', 'payment']);

const getAuthMode = (): 'remote-introspection' | 'offline-jwt' =>
  configs.jwt.remoteIntrospectionEnabled ? 'remote-introspection' : 'offline-jwt';

const getExpectedComponentNames = (): string[] => {
  if (!BACKEND_SERVICE_IDS.has(configs.serviceId)) {
    return ['db'];
  }

  const componentNames = ['db', 'rabbitmq', 'redis-rate-limit'];

  if (OUTBOX_SERVICE_IDS.has(configs.serviceId)) {
    componentNames.push('outbox');
  }

  if (configs.jwt.remoteIntrospectionEnabled && REMOTE_AUTH_SERVICE_IDS.has(configs.serviceId)) {
    componentNames.push('identity-auth-dependency');
  }

  return componentNames;
};

const getRequiredComponentNames = (): string[] => {
  if (!BACKEND_SERVICE_IDS.has(configs.serviceId)) {
    return ['db'];
  }

  return getExpectedComponentNames().filter((componentName) => componentName !== 'redis-rate-limit');
};

const getDefaultComponentStatus = (message: string): RuntimeComponentStatus => ({
  state: 'down',
  details: {
    message
  },
  updatedAt: new Date().toISOString()
});

export function registerHealthEndpoints(app: any): void {
  const runtimeHealthService = app.get(RuntimeHealthService);
  const dataSource = app.get(DataSource, { strict: false }) as DataSource | undefined;

  app.use('/health/live', (_request: Request, response: Response) => {
    response.status(200).json({
      service: configs.serviceName,
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/health/ready', (_request: Request, response: Response) => {
    try {
      const dbReady = dataSource ? dataSource.isInitialized : true;
      const expectedComponentNames = getExpectedComponentNames();
      const runtimeComponents = runtimeHealthService.getComponentStatuses();
      const components: Record<string, RuntimeComponentStatus> = {
        db: {
          state: dbReady ? 'up' : 'down',
          updatedAt: new Date().toISOString()
        },
        ...runtimeComponents
      };

      for (const componentName of expectedComponentNames) {
        if (!components[componentName]) {
          components[componentName] = getDefaultComponentStatus(
            `Missing runtime health signal for ${componentName}`
          );
        }
      }

      const requiredComponents = getRequiredComponentNames();
      const optionalComponents = expectedComponentNames.filter(
        (componentName) => !requiredComponents.includes(componentName)
      );
      const ready = requiredComponents.every((componentName) => components[componentName]?.state === 'up');
      const optionalHealthy = optionalComponents.every(
        (componentName) => components[componentName]?.state === 'up'
      );
      const state = ready ? (optionalHealthy ? 'ready' : 'degraded') : 'not_ready';

      response.status(ready ? 200 : 503).json({
        service: configs.serviceName,
        ready,
        state,
        authMode: getAuthMode(),
        requiredComponents,
        optionalComponents,
        timestamp: new Date().toISOString(),
        components
      });
    } catch (error) {
      Logger.error('Failed to compute readiness payload', error);
      response.status(503).json({
        service: configs.serviceName,
        ready: false,
        state: 'not_ready',
        timestamp: new Date().toISOString()
      });
    }
  });
}
