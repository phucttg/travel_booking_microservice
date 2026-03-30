import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'booking_outbox_message' })
export class OutboxMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  exchangeName: string;

  @Column({ type: 'text' })
  payload: string;

  @Column({ unique: true })
  messageId: string;

  @Column()
  traceId: string;

  @Column()
  idempotencyKey: string;

  @Column()
  producer: string;

  @Column()
  occurredAt: Date;

  @Column({ default: true })
  useEnvelope: boolean;

  @Column({ default: 0 })
  attempts: number;

  @Column()
  nextAttemptAt: Date;

  @Column({ nullable: true, type: 'text' })
  lastError?: string | null;

  @Column({ nullable: true })
  deliveredAt?: Date | null;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt?: Date | null;

  constructor(partial: Partial<OutboxMessage> = {}) {
    Object.assign(this, partial);
    this.createdAt = partial.createdAt ?? new Date();
    this.nextAttemptAt = partial.nextAttemptAt ?? new Date();
    this.useEnvelope = partial.useEnvelope ?? true;
    this.attempts = partial.attempts ?? 0;
  }
}
