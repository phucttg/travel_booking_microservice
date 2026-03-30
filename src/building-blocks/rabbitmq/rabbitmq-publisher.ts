import { Injectable, Logger } from '@nestjs/common';
import { snakeCase } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import configs from '../configs/configs';
import { createRabbitmqMessageEnvelope } from '../contracts/message-envelope.contract';
import { OtelDiagnosticsProvider } from '../openTelemetry/otel-diagnostics-provider';
import {
  rabbitmqPublishAckCounter,
  rabbitmqPublishNackCounter
} from '../monitoring/rabbitmq.metrics';
import { getTypeName } from '../utils/reflection';
import { serializeObject } from '../utils/serilization';
import { RabbitmqConnection } from './rabbitmq-connection';

const publishedMessages: string[] = [];

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

const getServiceIdentifier = (): string =>
  configs.serviceName || configs.opentelemetry.serviceName || 'unknown_service';

@Injectable()
export class RabbitmqPublisher implements IRabbitmqPublisher {
  constructor(
    private readonly rabbitMQConnection: RabbitmqConnection,
    private readonly otelDiagnosticsProvider: OtelDiagnosticsProvider
  ) {}

  async publishMessage<T>(message: T, options: PublishMessageOptions = {}): Promise<void> {
    const channel = await this.rabbitMQConnection.getPublisherChannel();
    const tracer = this.otelDiagnosticsProvider.getTracer();
    const exchangeName = options.exchangeName || snakeCase(getTypeName(message));
    const span = tracer.startSpan(`publish_message_${exchangeName}`);
    const messageId = options.metadata?.messageId || uuidv4();
    const traceId = options.metadata?.traceId || span.spanContext().traceId || messageId;
    const useEnvelope = options.useEnvelope ?? configs.rabbitmq.useEnvelope;
    const payload = useEnvelope
      ? createRabbitmqMessageEnvelope(message, {
          messageId,
          traceId,
          idempotencyKey: options.metadata?.idempotencyKey,
          producer: options.metadata?.producer
        })
      : message;

    if (
      useEnvelope &&
      options.metadata?.occurredAt &&
      typeof payload === 'object' &&
      payload !== null &&
      'occurredAt' in payload
    ) {
      (payload as Record<string, unknown>).occurredAt = options.metadata.occurredAt;
    }

    const serializedMessage = serializeObject(payload);

    try {
      await channel.assertExchange(exchangeName, 'fanout', {
        durable: true
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          rabbitmqPublishNackCounter.labels(exchangeName).inc();
          reject(new Error(`RabbitMQ publisher confirm timed out for exchange "${exchangeName}"`));
        }, configs.rabbitmq.publishConfirmTimeoutMs);

        channel.publish(
          exchangeName,
          '',
          Buffer.from(serializedMessage),
          {
            appId: options.metadata?.producer || getServiceIdentifier(),
            contentType: 'application/json',
            messageId,
            persistent: true,
            timestamp: Date.now(),
            type: exchangeName,
            headers: {
              exchange: exchangeName,
              traceId,
              schemaVersion: useEnvelope ? 1 : undefined,
              idempotencyKey: options.metadata?.idempotencyKey
            }
          },
          (error) => {
            clearTimeout(timeout);

            if (error) {
              rabbitmqPublishNackCounter.labels(exchangeName).inc();
              reject(error);
              return;
            }

            rabbitmqPublishAckCounter.labels(exchangeName).inc();
            resolve();
          }
        );
      });

      Logger.log(`Message sent with exchange "${exchangeName}" and messageId "${messageId}"`);
      publishedMessages.push(exchangeName);
      span.setAttributes({
        exchange: exchangeName,
        messageId,
        traceId,
        useEnvelope
      });
    } catch (error) {
      span.recordException(error as Error);
      Logger.error(`Failed to publish exchange "${exchangeName}"`, error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  async isPublished<T>(message: T): Promise<boolean> {
    const exchangeName = snakeCase(getTypeName(message));
    return Promise.resolve(publishedMessages.includes(exchangeName));
  }
}
