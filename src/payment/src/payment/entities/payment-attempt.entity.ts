import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';
import { FakePaymentScenario } from '@/payment/enums/fake-payment-scenario.enum';
import { PaymentStatus } from '@/payment/enums/payment-status.enum';

@Entity({ name: 'payment_attempt' })
export class PaymentAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  paymentId: number;

  @Column({
    type: 'enum',
    enum: FakePaymentScenario
  })
  scenario: FakePaymentScenario;

  @Column({
    type: 'enum',
    enum: PaymentStatus
  })
  paymentStatus: PaymentStatus;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt?: Date | null;

  @ManyToOne(() => PaymentIntent, (payment) => payment.attempts)
  payment?: PaymentIntent;

  constructor(partial: Partial<PaymentAttempt> = {}) {
    Object.assign(this, partial);
    this.createdAt = partial.createdAt ?? new Date();
  }
}
