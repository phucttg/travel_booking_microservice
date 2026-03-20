import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'booking_processed_message' })
export class ProcessedMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  consumer: string;

  @Column()
  messageKey: string;

  @Column()
  createdAt: Date;

  constructor(partial: Partial<ProcessedMessage> = {}) {
    Object.assign(this, partial);
    this.createdAt = partial.createdAt ?? new Date();
  }
}
