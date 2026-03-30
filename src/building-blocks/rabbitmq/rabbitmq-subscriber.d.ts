import { OnModuleDestroy } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { OtelDiagnosticsProvider } from '../openTelemetry/otel-diagnostics-provider';
import { RabbitmqMessageEnvelope } from '../contracts/message-envelope.contract';
import { RabbitmqConnection } from './rabbitmq-connection';
type MessageType<T> = T | ClassConstructor<T>;
type HandlerFunc<T> = (queue: string, message: T, envelope?: RabbitmqMessageEnvelope<T> | null) => Promise<void> | void;
export interface IRabbitmqConsumer {
    consumeMessage<T>(type: MessageType<T>, handler: HandlerFunc<T>): Promise<void>;
    isConsumed<T>(message: T): Promise<boolean>;
}
export declare class RabbitmqConsumer<T> implements IRabbitmqConsumer, OnModuleDestroy {
    private readonly rabbitMQConnection;
    private readonly otelDiagnosticsProvider;
    private readonly registrations;
    private readonly recoveryIntervalRef;
    private readonly channelIds;
    constructor(rabbitMQConnection: RabbitmqConnection, otelDiagnosticsProvider: OtelDiagnosticsProvider);
    onModuleDestroy(): void;
    consumeMessage<T>(type: MessageType<T>, handler: HandlerFunc<T>): Promise<void>;
    isConsumed<T>(message: T): Promise<boolean>;
    private ensureAllConsumers;
    private ensureConsumer;
    private parseIncomingMessage;
    private getMessageClass;
    private resolveMessageId;
    private extractUserId;
    private tryDeserializeMessage;
    private resolveChannelId;
}
export {};
