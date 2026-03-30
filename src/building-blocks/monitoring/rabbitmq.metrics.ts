import * as Prometheus from 'prom-client';

export const rabbitmqPublishAckCounter = new Prometheus.Counter({
  name: 'rabbitmq_publish_ack_total',
  help: 'Total number of RabbitMQ publishes acknowledged by the broker',
  labelNames: ['exchange'],
  registers: [Prometheus.register]
});

export const rabbitmqPublishNackCounter = new Prometheus.Counter({
  name: 'rabbitmq_publish_nack_total',
  help: 'Total number of RabbitMQ publishes rejected or failed before broker acknowledgement',
  labelNames: ['exchange'],
  registers: [Prometheus.register]
});

export const rabbitmqConnectionStateGauge = new Prometheus.Gauge({
  name: 'rabbitmq_connection_state',
  help: 'RabbitMQ connection state (1=up, 0=degraded/down)',
  registers: [Prometheus.register]
});

export const rabbitmqPublisherChannelStateGauge = new Prometheus.Gauge({
  name: 'rabbitmq_publisher_channel_state',
  help: 'RabbitMQ publisher confirm channel state (1=up, 0=degraded/down)',
  registers: [Prometheus.register]
});

export const rabbitmqConsumerChannelStateGauge = new Prometheus.Gauge({
  name: 'rabbitmq_consumer_channel_state',
  help: 'RabbitMQ consumer channel state (1=up, 0=degraded/down)',
  labelNames: ['channel'],
  registers: [Prometheus.register]
});
