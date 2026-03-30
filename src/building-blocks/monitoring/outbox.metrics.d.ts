import * as Prometheus from 'prom-client';
export declare const outboxBacklogGauge: Prometheus.Gauge<string>;
export declare const outboxOldestAgeGauge: Prometheus.Gauge<string>;
export declare const outboxDispatchFailureCounter: Prometheus.Counter<"exchange">;
