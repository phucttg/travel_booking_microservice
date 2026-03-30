export type RuntimeComponentState = 'up' | 'degraded' | 'down';
export type RuntimeComponentStatus = {
    state: RuntimeComponentState;
    details?: Record<string, unknown>;
    updatedAt: string;
};
export declare class RuntimeHealthService {
    private readonly components;
    setComponentStatus(name: string, state: RuntimeComponentState, details?: Record<string, unknown>): void;
    getComponentStatuses(): Record<string, RuntimeComponentStatus>;
}
