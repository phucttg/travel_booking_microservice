import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentAttempt } from '@/payment/entities/payment-attempt.entity';
import { Refund } from '@/payment/entities/refund.entity';
import { PaymentStatus } from '@/payment/enums/payment-status.enum';
import { RefundStatus } from '@/payment/enums/refund-status.enum';

@Entity({ name: 'payment_intent' })
export class PaymentIntent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  bookingId: number;

  @Column()
  userId: number;

  @Column({ type: 'float' })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ unique: true })
  paymentCode: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.NONE
  })
  refundStatus: RefundStatus;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  completedAt?: Date | null;

  @Column({ nullable: true })
  refundedAt?: Date | null;

  @Column({ nullable: true, unique: true })
  providerTxnId?: string | null;

  @Column({ nullable: true })
  reconciledAt?: Date | null;

  @Column({ nullable: true })
  reconciledBy?: number | null;

  @Column({ nullable: true })
  providerTransferContent?: string | null;

  @Column({ type: 'float', nullable: true })
  providerTransferredAmount?: number | null;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt?: Date | null;

  @OneToMany(() => PaymentAttempt, (attempt) => attempt.payment, { cascade: false })
  attempts?: PaymentAttempt[];

  @OneToMany(() => Refund, (refund) => refund.payment, { cascade: false })
  refunds?: Refund[];

  constructor(partial: Partial<PaymentIntent> = {}) {
    Object.assign(this, partial);
    this.createdAt = partial.createdAt ?? new Date();
  }
}
