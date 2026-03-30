import * as Prometheus from 'prom-client';
export declare const rabbitmqPublishAckCounter: Prometheus.Counter<"exchange">;
export declare const rabbitmqPublishNackCounter: Prometheus.Counter<"exchange">;
export declare const rabbitmqConnectionStateGauge: Prometheus.Gauge<string>;
export declare const rabbitmqPublisherChannelStateGauge: Prometheus.Gauge<string>;
export declare const rabbitmqConsumerChannelStateGauge: Prometheus.Gauge<"channel">;
