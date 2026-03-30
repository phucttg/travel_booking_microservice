"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rabbitmqConsumerChannelStateGauge = exports.rabbitmqPublisherChannelStateGauge = exports.rabbitmqConnectionStateGauge = exports.rabbitmqPublishNackCounter = exports.rabbitmqPublishAckCounter = void 0;
const Prometheus = __importStar(require("prom-client"));
exports.rabbitmqPublishAckCounter = new Prometheus.Counter({
    name: 'rabbitmq_publish_ack_total',
    help: 'Total number of RabbitMQ publishes acknowledged by the broker',
    labelNames: ['exchange'],
    registers: [Prometheus.register]
});
exports.rabbitmqPublishNackCounter = new Prometheus.Counter({
    name: 'rabbitmq_publish_nack_total',
    help: 'Total number of RabbitMQ publishes rejected or failed before broker acknowledgement',
    labelNames: ['exchange'],
    registers: [Prometheus.register]
});
exports.rabbitmqConnectionStateGauge = new Prometheus.Gauge({
    name: 'rabbitmq_connection_state',
    help: 'RabbitMQ connection state (1=up, 0=degraded/down)',
    registers: [Prometheus.register]
});
exports.rabbitmqPublisherChannelStateGauge = new Prometheus.Gauge({
    name: 'rabbitmq_publisher_channel_state',
    help: 'RabbitMQ publisher confirm channel state (1=up, 0=degraded/down)',
    registers: [Prometheus.register]
});
exports.rabbitmqConsumerChannelStateGauge = new Prometheus.Gauge({
    name: 'rabbitmq_consumer_channel_state',
    help: 'RabbitMQ consumer channel state (1=up, 0=degraded/down)',
    labelNames: ['channel'],
    registers: [Prometheus.register]
});
//# sourceMappingURL=rabbitmq.metrics.js.map