import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import configs from '../configs/configs';
import {
  createInternalAuthHeaders,
  resolveInternalServiceName
} from '../internal-auth/internal-auth.headers';
import { RuntimeHealthService } from './runtime-health.service';

const PROBE_PATH = '/api/v1/internal/health/auth-dependency';

@Injectable()
export class IdentityAuthDependencyHealthService implements OnModuleInit, OnModuleDestroy {
  private intervalRef?: NodeJS.Timeout;

  constructor(private readonly runtimeHealthService: RuntimeHealthService) {}

  onModuleInit(): void {
    if (!configs.jwt.remoteIntrospectionEnabled) {
      return;
    }

    this.runtimeHealthService.setComponentStatus('identity-auth-dependency', 'down', {
      message: 'Waiting for initial identity auth dependency probe'
    });

    this.intervalRef = setInterval(() => {
      void this.probeAsync();
    }, configs.health.authDependencyPollIntervalMs);

    void this.probeAsync();
  }

  onModuleDestroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  private async probeAsync(): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), configs.health.authDependencyTimeoutMs);
    const baseUrl = configs.identity.serviceBaseUrl.replace(/\/+$/, '');

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
    } catch (error) {
      this.runtimeHealthService.setComponentStatus('identity-auth-dependency', 'down', {
        error: error instanceof Error ? error.message : String(error),
        target: `${baseUrl}${PROBE_PATH}`
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private createHeaders(): Record<string, string> {
    if (!configs.internalAuth.secret) {
      return {};
    }

    return createInternalAuthHeaders({
      secret: configs.internalAuth.secret,
      serviceName: resolveInternalServiceName(configs.serviceName),
      method: 'GET',
      path: PROBE_PATH
    });
  }
}
