import { Injectable } from '@nestjs/common';

export type RuntimeComponentState = 'up' | 'degraded' | 'down';

export type RuntimeComponentStatus = {
  state: RuntimeComponentState;
  details?: Record<string, unknown>;
  updatedAt: string;
};

@Injectable()
export class RuntimeHealthService {
  private readonly components = new Map<string, RuntimeComponentStatus>();

  setComponentStatus(
    name: string,
    state: RuntimeComponentState,
    details?: Record<string, unknown>
  ): void {
    this.components.set(name, {
      state,
      details,
      updatedAt: new Date().toISOString()
    });
  }

  getComponentStatuses(): Record<string, RuntimeComponentStatus> {
    return Array.from(this.components.entries()).reduce<Record<string, RuntimeComponentStatus>>(
      (accumulator, [name, status]) => {
        accumulator[name] = status;
        return accumulator;
      },
      {}
    );
  }
}
