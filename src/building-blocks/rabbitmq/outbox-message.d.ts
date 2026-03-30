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
export declare const prepareOutboxMessage: <T>(message: T, options?: {
    exchangeName?: string;
    messageId?: string;
    traceId?: string;
    idempotencyKey?: string;
    producer?: string;
    occurredAt?: Date;
    useEnvelope?: boolean;
    nextAttemptAt?: Date;
}) => PreparedOutboxMessage;
