"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareOutboxMessage = void 0;
const crypto_1 = require("crypto");
const lodash_1 = require("lodash");
const configs_1 = __importDefault(require("../configs/configs"));
const context_1 = require("../context/context");
const reflection_1 = require("../utils/reflection");
const serilization_1 = require("../utils/serilization");
const getServiceIdentifier = () => configs_1.default.serviceName || configs_1.default.opentelemetry.serviceName || 'unknown_service';
const prepareOutboxMessage = (message, options = {}) => {
    const messageId = options.messageId || (0, crypto_1.randomUUID)();
    const traceId = options.traceId || context_1.RequestContext.getRequestId() || messageId;
    const occurredAt = options.occurredAt || new Date();
    return {
        exchangeName: options.exchangeName || (0, lodash_1.snakeCase)((0, reflection_1.getTypeName)(message)),
        payload: (0, serilization_1.serializeObject)(message),
        messageId,
        traceId,
        idempotencyKey: options.idempotencyKey || messageId,
        producer: options.producer || getServiceIdentifier(),
        occurredAt,
        useEnvelope: options.useEnvelope ?? true,
        attempts: 0,
        nextAttemptAt: options.nextAttemptAt || new Date(),
        createdAt: new Date()
    };
};
exports.prepareOutboxMessage = prepareOutboxMessage;
//# sourceMappingURL=outbox-message.js.map