import type { Express } from 'express';
import type { DataSource } from 'typeorm';

type ServiceSetupInput = {
  serviceName: string;
  otelServiceName: string;
  remoteIntrospectionEnabled?: boolean;
  dbReady?: boolean;
  components?: Record<string, 'up' | 'degraded' | 'down'>;
};

describe('registerHealthEndpoints', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  const createApp = async (input: ServiceSetupInput): Promise<Express> => {
    process.env.NODE_ENV = 'test';
    process.env.APP_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-1234';
    process.env.SERVICE_NAME = input.serviceName;
    process.env.OPEN_TELEMETRY_SERVICE_NAME = input.otelServiceName;
    process.env.JWT_REMOTE_INTROSPECTION_ENABLED = String(input.remoteIntrospectionEnabled ?? true);

    jest.resetModules();

    const express = (await import('express')).default;
    const { DataSource } = await import('typeorm');
    const { RuntimeHealthService } = await import('building-blocks/health/runtime-health.service');
    const { registerHealthEndpoints } = await import('building-blocks/health/register-health-endpoints');

    const runtimeHealthService = new RuntimeHealthService();
    const dataSource = {
      isInitialized: input.dbReady ?? true
    } as DataSource;

    for (const [componentName, componentState] of Object.entries(input.components || {})) {
      runtimeHealthService.setComponentStatus(componentName, componentState);
    }

    const expressApp = express();
    const app = {
      get(token) {
        if (token === RuntimeHealthService) {
          return runtimeHealthService;
        }

        if (token === DataSource) {
          return dataSource;
        }

        return undefined;
      },
      use: expressApp.use.bind(expressApp)
    };

    registerHealthEndpoints(app);
    return expressApp;
  };

  const invokeReadyEndpoint = async (
    app: Express
  ): Promise<{ status: number; body: Record<string, any> }> => {
    return await new Promise((resolve, reject) => {
      const request = {
        method: 'GET',
        url: '/health/ready',
        originalUrl: '/health/ready',
        headers: {}
      } as any;

      const response = {
        statusCode: 200,
        headers: {} as Record<string, unknown>,
        setHeader(name: string, value: unknown) {
          this.headers[name] = value;
          return this;
        },
        getHeader(name: string) {
          return this.headers[name];
        },
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payload: Record<string, any>) {
          resolve({
            status: this.statusCode,
            body: payload
          });
          return this;
        }
      } as any;

      (app as any).handle(request, response, reject);
    });
  };

  it('keeps readiness at 200 when only redis-rate-limit is degraded', async () => {
    const app = await createApp({
      serviceName: 'identity service',
      otelServiceName: 'identity',
      components: {
        rabbitmq: 'up',
        outbox: 'up',
        'redis-rate-limit': 'degraded'
      }
    });

    const response = await invokeReadyEndpoint(app);

    expect(response.status).toBe(200);
    expect(response.body.ready).toBe(true);
    expect(response.body.state).toBe('degraded');
    expect(response.body.components['redis-rate-limit'].state).toBe('degraded');
  });

  it('returns 503 when booking remote auth dependency is down', async () => {
    const app = await createApp({
      serviceName: 'booking service',
      otelServiceName: 'booking',
      components: {
        rabbitmq: 'up',
        outbox: 'up',
        'redis-rate-limit': 'up',
        'identity-auth-dependency': 'down'
      }
    });

    const response = await invokeReadyEndpoint(app);

    expect(response.status).toBe(503);
    expect(response.body.ready).toBe(false);
    expect(response.body.requiredComponents).toContain('identity-auth-dependency');
    expect(response.body.components['identity-auth-dependency'].state).toBe('down');
  });
});
