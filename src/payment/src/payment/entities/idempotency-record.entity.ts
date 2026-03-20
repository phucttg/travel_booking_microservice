import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'payment_idempotency_record' })
export class IdempotencyRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  scope: string;

  @Column()
  idempotencyKey: string;

  @Column()
  requestHash: string;

  @Column({ nullable: true })
  userId?: number | null;

  @Column({ type: 'text' })
  responseBody: string;

  @Column()
  statusCode: number;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt?: Date | null;

  constructor(partial: Partial<IdempotencyRecord> = {}) {
    Object.assign(this, partial);
    this.createdAt = partial.createdAt ?? new Date();
  }
}
