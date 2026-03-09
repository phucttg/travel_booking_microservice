import { IsISO8601, IsInt, IsNotEmpty, IsObject, IsString, IsUUID, Min } from 'class-validator';
import configs from '../configs/configs';
import { ToInteger } from '../validation/validation.decorators';

export const MESSAGE_SCHEMA_VERSION = 1;

export class RabbitmqMessageEnvelopeDto {
  @ToInteger()
  @IsInt()
  @Min(MESSAGE_SCHEMA_VERSION)
  schemaVersion = MESSAGE_SCHEMA_VERSION;

  @IsUUID()
  messageId: string;

  @IsISO8601()
  occurredAt: string;

  @IsString()
  @IsNotEmpty()
  producer: string;

  @IsString()
  @IsNotEmpty()
  traceId: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsObject()
  payload: Record<string, unknown>;
}

export type RabbitmqMessageEnvelope<T> = Omit<RabbitmqMessageEnvelopeDto, 'payload'> & {
  payload: T;
};

export const isRabbitmqMessageEnvelope = (
  value: unknown
): value is RabbitmqMessageEnvelope<Record<string, unknown>> =>
  typeof value === 'object' &&
  value !== null &&
  'payload' in value &&
  'schemaVersion' in value &&
  'messageId' in value;

export const createRabbitmqMessageEnvelope = <T>(
  payload: T,
  metadata: {
    messageId: string;
    traceId: string;
    idempotencyKey?: string;
    producer?: string;
  }
): RabbitmqMessageEnvelope<T> => ({
  schemaVersion: MESSAGE_SCHEMA_VERSION,
  messageId: metadata.messageId,
  occurredAt: new Date().toISOString(),
  producer: metadata.producer ?? configs.serviceName ?? configs.opentelemetry.serviceName,
  traceId: metadata.traceId,
  idempotencyKey: metadata.idempotencyKey ?? metadata.messageId,
  payload
});
