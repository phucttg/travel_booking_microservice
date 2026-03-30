import { randomUUID } from 'crypto';
import { snakeCase } from 'lodash';
import configs from '../configs/configs';
import { RequestContext } from '../context/context';
import { getTypeName } from '../utils/reflection';
import { serializeObject } from '../utils/serilization';

export type PreparedOutboxMessage = {
  exchangeName: string;
  payload: string;
  messageId: string;
  traceId: string;
  idempotencyKey: string;
  producer: string;
  occurredAt: Date;
  useEnvelope: boolean;
  attempts: number;
  nextAttemptAt: Date;
  createdAt: Date;
};

const getServiceIdentifier = (): string =>
  configs.serviceName || configs.opentelemetry.serviceName || 'unknown_service';

export const prepareOutboxMessage = <T>(
  message: T,
  options: {
    exchangeName?: string;
    messageId?: string;
    traceId?: string;
    idempotencyKey?: string;
    producer?: string;
    occurredAt?: Date;
    useEnvelope?: boolean;
    nextAttemptAt?: Date;
  } = {}
): PreparedOutboxMessage => {
  const messageId = options.messageId || randomUUID();
  const traceId = options.traceId || RequestContext.getRequestId() || messageId;
  const occurredAt = options.occurredAt || new Date();

  return {
    exchangeName: options.exchangeName || snakeCase(getTypeName(message)),
    payload: serializeObject(message),
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
