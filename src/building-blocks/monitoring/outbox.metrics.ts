import * as Prometheus from 'prom-client';

export const outboxBacklogGauge = new Prometheus.Gauge({
  name: 'service_outbox_backlog',
  help: 'Number of undelivered messages currently in the service outbox',
  registers: [Prometheus.register]
});

export const outboxOldestAgeGauge = new Prometheus.Gauge({
  name: 'service_outbox_oldest_age_seconds',
  help: 'Age in seconds of the oldest undelivered outbox message',
  registers: [Prometheus.register]
});

export const outboxDispatchFailureCounter = new Prometheus.Counter({
  name: 'service_outbox_dispatch_failure_total',
  help: 'Total number of outbox dispatch failures',
  labelNames: ['exchange'],
  registers: [Prometheus.register]
});
