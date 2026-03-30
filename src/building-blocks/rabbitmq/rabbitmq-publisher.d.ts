import { OtelDiagnosticsProvider } from '../openTelemetry/otel-diagnostics-provider';
import { RabbitmqConnection } from './rabbitmq-connection';
export interface PublishMessageOptions {
    useEnvelope?: boolean;
    exchangeName?: string;
    metadata?: {
        messageId?: string;
        traceId?: string;
        idempotencyKey?: string;
        occurredAt?: string;
        producer?: string;
    };
}
export interface IRabbitmqPublisher {
    publishMessage<T>(message: T, options?: PublishMessageOptions): Promise<void>;
    isPublished<T>(message: T): Promise<boolean>;
}
export declare class RabbitmqPublisher implements IRabbitmqPublisher {
    private readonly rabbitMQConnection;
    private readonly otelDiagnosticsProvider;
    constructor(rabbitMQConnection: RabbitmqConnection, otelDiagnosticsProvider: OtelDiagnosticsProvider);
    publishMessage<T>(message: T, options?: PublishMessageOptions): Promise<void>;
    isPublished<T>(message: T): Promise<boolean>;
}
