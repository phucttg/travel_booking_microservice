import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import configs from '../configs/configs';
import { RuntimeComponentStatus, RuntimeHealthService } from './runtime-health.service';

const getAuthMode = (): 'remote-introspection' | 'offline-jwt' =>
  configs.jwt.remoteIntrospectionEnabled ? 'remote-introspection' : 'offline-jwt';

export function registerHealthEndpoints(app: any): void {
  const runtimeHealthService = app.get(RuntimeHealthService);
  const dataSource = app.get(DataSource, { strict: false }) as DataSource | undefined;

  runtimeHealthService.setComponentStatus('authMode', 'up', {
    mode: getAuthMode()
  });

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
      const components: Record<string, RuntimeComponentStatus> = {
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
        service: configs.serviceName,
        ready: dbReady,
        state,
        authMode: getAuthMode(),
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
