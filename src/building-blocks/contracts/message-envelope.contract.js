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
exports.createRabbitmqMessageEnvelope = exports.isRabbitmqMessageEnvelope = exports.RabbitmqMessageEnvelopeDto = exports.MESSAGE_SCHEMA_VERSION = void 0;
const class_validator_1 = require("class-validator");
const configs_1 = __importDefault(require("../configs/configs"));
const validation_decorators_1 = require("../validation/validation.decorators");
exports.MESSAGE_SCHEMA_VERSION = 1;
class RabbitmqMessageEnvelopeDto {
    schemaVersion = exports.MESSAGE_SCHEMA_VERSION;
    messageId;
    occurredAt;
    producer;
    traceId;
    idempotencyKey;
    payload;
}
exports.RabbitmqMessageEnvelopeDto = RabbitmqMessageEnvelopeDto;
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(exports.MESSAGE_SCHEMA_VERSION),
    __metadata("design:type", Object)
], RabbitmqMessageEnvelopeDto.prototype, "schemaVersion", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RabbitmqMessageEnvelopeDto.prototype, "messageId", void 0);
__decorate([
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], RabbitmqMessageEnvelopeDto.prototype, "occurredAt", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RabbitmqMessageEnvelopeDto.prototype, "producer", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RabbitmqMessageEnvelopeDto.prototype, "traceId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RabbitmqMessageEnvelopeDto.prototype, "idempotencyKey", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], RabbitmqMessageEnvelopeDto.prototype, "payload", void 0);
const isRabbitmqMessageEnvelope = (value) => typeof value === 'object' &&
    value !== null &&
    'payload' in value &&
    'schemaVersion' in value &&
    'messageId' in value;
exports.isRabbitmqMessageEnvelope = isRabbitmqMessageEnvelope;
const createRabbitmqMessageEnvelope = (payload, metadata) => ({
    schemaVersion: exports.MESSAGE_SCHEMA_VERSION,
    messageId: metadata.messageId,
    occurredAt: new Date().toISOString(),
    producer: metadata.producer ?? configs_1.default.serviceName ?? configs_1.default.opentelemetry.serviceName,
    traceId: metadata.traceId,
    idempotencyKey: metadata.idempotencyKey ?? metadata.messageId,
    payload
});
exports.createRabbitmqMessageEnvelope = createRabbitmqMessageEnvelope;
//# sourceMappingURL=message-envelope.contract.js.map