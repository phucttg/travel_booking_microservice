import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RuntimeHealthService } from './runtime-health.service';
export declare class IdentityAuthDependencyHealthService implements OnModuleInit, OnModuleDestroy {
    private readonly runtimeHealthService;
    private intervalRef?;
    constructor(runtimeHealthService: RuntimeHealthService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private probeAsync;
    private createHeaders;
}
