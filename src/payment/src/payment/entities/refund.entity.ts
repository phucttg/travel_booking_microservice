import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';
import { RefundStatus } from '@/payment/enums/refund-status.enum';

@Entity({ name: 'refund' })
export class Refund {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  paymentId: number;

  @Column({ type: 'float' })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({
    type: 'enum',
    enum: RefundStatus
  })
  refundStatus: RefundStatus;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt?: Date | null;

  @Column({ nullable: true })
  completedAt?: Date | null;

  @ManyToOne(() => PaymentIntent, (payment) => payment.refunds)
  payment?: PaymentIntent;

  constructor(partial: Partial<Refund> = {}) {
    Object.assign(this, partial);
    this.createdAt = partial.createdAt ?? new Date();
  }
}
