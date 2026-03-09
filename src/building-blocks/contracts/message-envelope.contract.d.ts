export declare const MESSAGE_SCHEMA_VERSION = 1;
export declare class RabbitmqMessageEnvelopeDto {
    schemaVersion: number;
    messageId: string;
    occurredAt: string;
    producer: string;
    traceId: string;
    idempotencyKey: string;
    payload: Record<string, unknown>;
}
export type RabbitmqMessageEnvelope<T> = Omit<RabbitmqMessageEnvelopeDto, 'payload'> & {
    payload: T;
};
export declare const isRabbitmqMessageEnvelope: (value: unknown) => value is RabbitmqMessageEnvelope<Record<string, unknown>>;
export declare const createRabbitmqMessageEnvelope: <T>(payload: T, metadata: {
    messageId: string;
    traceId: string;
    idempotencyKey?: string;
    producer?: string;
}) => RabbitmqMessageEnvelope<T>;
