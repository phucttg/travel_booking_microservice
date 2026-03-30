import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { randomUUID } from 'crypto';
import { snakeCase } from 'lodash';
import { deserializeObject, serializeObject } from '../utils/serilization';
import { sleep } from '../utils/time';
import configs from '../configs/configs';
import { OtelDiagnosticsProvider } from '../openTelemetry/otel-diagnostics-provider';
import {
  isRabbitmqMessageEnvelope,
  RabbitmqMessageEnvelope,
  RabbitmqMessageEnvelopeDto
} from '../contracts/message-envelope.contract';
import { validateModel } from '../validation/validation.utils';
import { getTypeName } from '../utils/reflection';
import { RabbitmqConnection } from './rabbitmq-connection';

type MessageType<T> = T | ClassConstructor<T>;
type HandlerFunc<T> = (
  queue: string,
  message: T,
  envelope?: RabbitmqMessageEnvelope<T> | null
) => Promise<void> | void;

type ConsumerRegistration<T> = {
  type: MessageType<T>;
  handler: HandlerFunc<T>;
  exchangeName: string;
  queueName: string;
  channelName: string;
  consumerTag?: string | null;
  boundChannel?: { channelId: string };
};

const consumedMessages: string[] = [];

export interface IRabbitmqConsumer {
  consumeMessage<T>(type: MessageType<T>, handler: HandlerFunc<T>): Promise<void>;
  isConsumed<T>(message: T): Promise<boolean>;
}

const getServiceIdentifier = (): string =>
  configs.serviceName || configs.opentelemetry.serviceName || 'unknown_service';

@Injectable()
export class RabbitmqConsumer<T> implements IRabbitmqConsumer, OnModuleDestroy {
  private readonly registrations = new Map<string, ConsumerRegistration<unknown>>();
  private readonly recoveryIntervalRef: NodeJS.Timeout;
  private readonly channelIds = new WeakMap<object, string>();

  constructor(
    private readonly rabbitMQConnection: RabbitmqConnection,
    private readonly otelDiagnosticsProvider: OtelDiagnosticsProvider
  ) {
    this.recoveryIntervalRef = setInterval(() => {
      void this.ensureAllConsumers();
    }, 5000);
  }

  onModuleDestroy(): void {
    clearInterval(this.recoveryIntervalRef);
  }

  async consumeMessage<T>(type: MessageType<T>, handler: HandlerFunc<T>): Promise<void> {
    const exchangeName = snakeCase(getTypeName(type));
    const queueName = `${getServiceIdentifier()}.${exchangeName}`;
    const registration: ConsumerRegistration<T> = {
      type,
      handler,
      exchangeName,
      queueName,
      channelName: queueName
    };

    this.registrations.set(queueName, registration as ConsumerRegistration<unknown>);
    void this.ensureConsumer(registration);
  }

  async isConsumed<T>(message: T): Promise<boolean> {
    const timeoutTime = 30000;
    const startTime = Date.now();
    let timeOutExpired = false;
    let isConsumed = false;

    while (true) {
      if (timeOutExpired) {
        return false;
      }

      if (isConsumed) {
        return true;
      }

      await sleep(2000);
      const exchangeName = snakeCase(getTypeName(message));
      isConsumed = consumedMessages.includes(exchangeName);
      timeOutExpired = Date.now() - startTime > timeoutTime;
    }
  }

  private async ensureAllConsumers(): Promise<void> {
    for (const registration of this.registrations.values()) {
      await this.ensureConsumer(registration);
    }
  }

  private async ensureConsumer<T>(registration: ConsumerRegistration<T>): Promise<void> {
    try {
      const channel = await this.rabbitMQConnection.getConsumerChannel(registration.channelName);
      const channelId = this.resolveChannelId(channel);

      if (registration.consumerTag && registration.boundChannel?.channelId === channelId) {
        return;
      }

      const deadLetterExchangeName = `${registration.exchangeName}.dlx`;
      const deadLetterQueueName = `${registration.queueName}.dlq`;

      await channel.assertExchange(registration.exchangeName, 'fanout', {
        durable: true
      });
      await channel.assertExchange(deadLetterExchangeName, 'direct', {
        durable: true
      });
      await channel.assertQueue(deadLetterQueueName, {
        durable: true
      });
      await channel.bindQueue(deadLetterQueueName, deadLetterExchangeName, registration.queueName);

      const queue = await channel.assertQueue(registration.queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': deadLetterExchangeName,
          'x-dead-letter-routing-key': registration.queueName
        }
      });

      await channel.bindQueue(queue.queue, registration.exchangeName, '');
      await channel.prefetch(1);

      Logger.log(
        `Waiting for messages with exchange "${registration.exchangeName}" on queue "${queue.queue}".`
      );

      const consumerResult = await channel.consume(
        queue.queue,
        async (message) => {
          if (message === null) {
            return;
          }

          const tracer = this.otelDiagnosticsProvider.getTracer();
          const span = tracer.startSpan(`receive_message_${registration.exchangeName}`);
          const messageContent = message.content.toString();
          const headers = message.properties.headers || {};

          try {
            const parsedMessage = this.parseIncomingMessage(registration.type, messageContent);
            const deathCount = Array.isArray(headers['x-death']) ? headers['x-death'].length : 0;

            if (parsedMessage.isLegacy) {
              Logger.warn(
                `Legacy raw event consumed on exchange "${registration.exchangeName}". Compatibility window still active.`
              );
            }

            await registration.handler(queue.queue, parsedMessage.payload, parsedMessage.envelope);

            Logger.log(
              `Message delivered to queue ${queue.queue} with exchange ${registration.exchangeName}: ${messageContent}`
            );
            channel.ack(message);
            consumedMessages.push(registration.exchangeName);

            span.setAttributes({
              queue: queue.queue,
              exchange: registration.exchangeName,
              legacyPayload: parsedMessage.isLegacy,
              deathCount,
              messageId:
                parsedMessage.envelope?.messageId || message.properties.messageId || 'unknown'
            });
          } catch (error) {
            Logger.error(
              serializeObject({
                exchange: registration.exchangeName,
                queue: queue.queue,
                messageId: this.resolveMessageId(message.properties.messageId, messageContent),
                userId: this.extractUserId(messageContent),
                content: messageContent,
                error: error instanceof Error ? error.message : String(error)
              })
            );

            channel.nack(message, false, false);
            span.recordException(error as Error);
          } finally {
            span.end();
          }
        },
        { noAck: false }
      );

      registration.boundChannel = { channelId };
      registration.consumerTag = consumerResult.consumerTag;
    } catch (error) {
      Logger.error(
        `Failed to ensure consumer for exchange "${registration.exchangeName}"`,
        error as Error
      );
    }
  }

  private parseIncomingMessage<T>(type: MessageType<T>, content: string): {
    payload: T;
    envelope: RabbitmqMessageEnvelope<T> | null;
    isLegacy: boolean;
  } {
    const rawMessage = deserializeObject<Record<string, unknown>>(content);
    const messageClass = this.getMessageClass(type);

    if (isRabbitmqMessageEnvelope(rawMessage)) {
      const envelope = validateModel(RabbitmqMessageEnvelopeDto, rawMessage);
      const payload = validateModel(messageClass, envelope.payload);

      return {
        payload,
        envelope: {
          ...envelope,
          payload
        },
        isLegacy: false
      };
    }

    const payload = validateModel(messageClass, rawMessage);

    return {
      payload,
      envelope: null,
      isLegacy: true
    };
  }

  private getMessageClass<T>(type: MessageType<T>): ClassConstructor<T> {
    if (typeof type === 'function') {
      return type as ClassConstructor<T>;
    }

    return (type as T & { constructor: ClassConstructor<T> }).constructor;
  }

  private resolveMessageId(fallbackMessageId: string | undefined, content: string): string {
    const rawMessage = this.tryDeserializeMessage(content);

    if (
      rawMessage &&
      typeof rawMessage === 'object' &&
      'messageId' in rawMessage &&
      typeof rawMessage.messageId === 'string'
    ) {
      return rawMessage.messageId;
    }

    return fallbackMessageId || 'unknown';
  }

  private extractUserId(content: string): number | string | undefined {
    const rawMessage = this.tryDeserializeMessage(content);

    if (!rawMessage || typeof rawMessage !== 'object') {
      return undefined;
    }

    if ('payload' in rawMessage && rawMessage.payload && typeof rawMessage.payload === 'object') {
      const payload = rawMessage.payload as Record<string, unknown>;

      if (typeof payload.id === 'number' || typeof payload.id === 'string') {
        return payload.id;
      }
    }

    if ('id' in rawMessage && (typeof rawMessage.id === 'number' || typeof rawMessage.id === 'string')) {
      return rawMessage.id;
    }

    return undefined;
  }

  private tryDeserializeMessage(content: string): Record<string, unknown> | null {
    try {
      return deserializeObject<Record<string, unknown>>(content);
    } catch {
      return null;
    }
  }

  private resolveChannelId(channel: object): string {
    const existingChannelId = this.channelIds.get(channel);

    if (existingChannelId) {
      return existingChannelId;
    }

    const channelId = randomUUID();
    this.channelIds.set(channel, channelId);
    return channelId;
  }
}
