"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitmqConsumer = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const lodash_1 = require("lodash");
const serilization_1 = require("../utils/serilization");
const time_1 = require("../utils/time");
const configs_1 = __importDefault(require("../configs/configs"));
const otel_diagnostics_provider_1 = require("../openTelemetry/otel-diagnostics-provider");
const message_envelope_contract_1 = require("../contracts/message-envelope.contract");
const validation_utils_1 = require("../validation/validation.utils");
const reflection_1 = require("../utils/reflection");
const rabbitmq_connection_1 = require("./rabbitmq-connection");
const consumedMessages = [];
const getServiceIdentifier = () => configs_1.default.serviceName || configs_1.default.opentelemetry.serviceName || 'unknown_service';
let RabbitmqConsumer = class RabbitmqConsumer {
    rabbitMQConnection;
    otelDiagnosticsProvider;
    registrations = new Map();
    recoveryIntervalRef;
    channelIds = new WeakMap();
    constructor(rabbitMQConnection, otelDiagnosticsProvider) {
        this.rabbitMQConnection = rabbitMQConnection;
        this.otelDiagnosticsProvider = otelDiagnosticsProvider;
        this.recoveryIntervalRef = setInterval(() => {
            void this.ensureAllConsumers();
        }, 5000);
    }
    onModuleDestroy() {
        clearInterval(this.recoveryIntervalRef);
    }
    async consumeMessage(type, handler) {
        const exchangeName = (0, lodash_1.snakeCase)((0, reflection_1.getTypeName)(type));
        const queueName = `${getServiceIdentifier()}.${exchangeName}`;
        const registration = {
            type,
            handler,
            exchangeName,
            queueName,
            channelName: queueName
        };
        this.registrations.set(queueName, registration);
        void this.ensureConsumer(registration);
    }
    async isConsumed(message) {
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
            await (0, time_1.sleep)(2000);
            const exchangeName = (0, lodash_1.snakeCase)((0, reflection_1.getTypeName)(message));
            isConsumed = consumedMessages.includes(exchangeName);
            timeOutExpired = Date.now() - startTime > timeoutTime;
        }
    }
    async ensureAllConsumers() {
        for (const registration of this.registrations.values()) {
            await this.ensureConsumer(registration);
        }
    }
    async ensureConsumer(registration) {
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
            common_1.Logger.log(`Waiting for messages with exchange "${registration.exchangeName}" on queue "${queue.queue}".`);
            const consumerResult = await channel.consume(queue.queue, async (message) => {
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
                        common_1.Logger.warn(`Legacy raw event consumed on exchange "${registration.exchangeName}". Compatibility window still active.`);
                    }
                    await registration.handler(queue.queue, parsedMessage.payload, parsedMessage.envelope);
                    common_1.Logger.log(`Message delivered to queue ${queue.queue} with exchange ${registration.exchangeName}: ${messageContent}`);
                    channel.ack(message);
                    consumedMessages.push(registration.exchangeName);
                    span.setAttributes({
                        queue: queue.queue,
                        exchange: registration.exchangeName,
                        legacyPayload: parsedMessage.isLegacy,
                        deathCount,
                        messageId: parsedMessage.envelope?.messageId || message.properties.messageId || 'unknown'
                    });
                }
                catch (error) {
                    common_1.Logger.error((0, serilization_1.serializeObject)({
                        exchange: registration.exchangeName,
                        queue: queue.queue,
                        messageId: this.resolveMessageId(message.properties.messageId, messageContent),
                        userId: this.extractUserId(messageContent),
                        content: messageContent,
                        error: error instanceof Error ? error.message : String(error)
                    }));
                    channel.nack(message, false, false);
                    span.recordException(error);
                }
                finally {
                    span.end();
                }
            }, { noAck: false });
            registration.boundChannel = { channelId };
            registration.consumerTag = consumerResult.consumerTag;
        }
        catch (error) {
            common_1.Logger.error(`Failed to ensure consumer for exchange "${registration.exchangeName}"`, error);
        }
    }
    parseIncomingMessage(type, content) {
        const rawMessage = (0, serilization_1.deserializeObject)(content);
        const messageClass = this.getMessageClass(type);
        if ((0, message_envelope_contract_1.isRabbitmqMessageEnvelope)(rawMessage)) {
            const envelope = (0, validation_utils_1.validateModel)(message_envelope_contract_1.RabbitmqMessageEnvelopeDto, rawMessage);
            const payload = (0, validation_utils_1.validateModel)(messageClass, envelope.payload);
            return {
                payload,
                envelope: {
                    ...envelope,
                    payload
                },
                isLegacy: false
            };
        }
        const payload = (0, validation_utils_1.validateModel)(messageClass, rawMessage);
        return {
            payload,
            envelope: null,
            isLegacy: true
        };
    }
    getMessageClass(type) {
        if (typeof type === 'function') {
            return type;
        }
        return type.constructor;
    }
    resolveMessageId(fallbackMessageId, content) {
        const rawMessage = this.tryDeserializeMessage(content);
        if (rawMessage &&
            typeof rawMessage === 'object' &&
            'messageId' in rawMessage &&
            typeof rawMessage.messageId === 'string') {
            return rawMessage.messageId;
        }
        return fallbackMessageId || 'unknown';
    }
    extractUserId(content) {
        const rawMessage = this.tryDeserializeMessage(content);
        if (!rawMessage || typeof rawMessage !== 'object') {
            return undefined;
        }
        if ('payload' in rawMessage && rawMessage.payload && typeof rawMessage.payload === 'object') {
            const payload = rawMessage.payload;
            if (typeof payload.id === 'number' || typeof payload.id === 'string') {
                return payload.id;
            }
        }
        if ('id' in rawMessage && (typeof rawMessage.id === 'number' || typeof rawMessage.id === 'string')) {
            return rawMessage.id;
        }
        return undefined;
    }
    tryDeserializeMessage(content) {
        try {
            return (0, serilization_1.deserializeObject)(content);
        }
        catch {
            return null;
        }
    }
    resolveChannelId(channel) {
        const existingChannelId = this.channelIds.get(channel);
        if (existingChannelId) {
            return existingChannelId;
        }
        const channelId = (0, crypto_1.randomUUID)();
        this.channelIds.set(channel, channelId);
        return channelId;
    }
};
exports.RabbitmqConsumer = RabbitmqConsumer;
exports.RabbitmqConsumer = RabbitmqConsumer = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rabbitmq_connection_1.RabbitmqConnection,
        otel_diagnostics_provider_1.OtelDiagnosticsProvider])
], RabbitmqConsumer);
//# sourceMappingURL=rabbitmq-subscriber.js.map