import { In, LessThanOrEqual, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';
import { PaymentAttempt } from '@/payment/entities/payment-attempt.entity';
import { Refund } from '@/payment/entities/refund.entity';
import { PaymentStatus } from 'building-blocks/contracts/payment.contract';

export interface IPaymentRepository {
  createPaymentIntent(payment: PaymentIntent): Promise<PaymentIntent>;
  updatePaymentIntent(payment: PaymentIntent): Promise<PaymentIntent>;
  findPaymentById(id: number): Promise<PaymentIntent>;
  findPaymentByBookingId(bookingId: number): Promise<PaymentIntent>;
  findPaymentByCode(paymentCode: string): Promise<PaymentIntent>;
  findPaymentByProviderTxnId(providerTxnId: string): Promise<PaymentIntent>;
  createAttempt(attempt: PaymentAttempt): Promise<PaymentAttempt>;
  createRefund(refund: Refund): Promise<Refund>;
  findExpiredCandidates(now: Date): Promise<PaymentIntent[]>;
}

export class PaymentRepository implements IPaymentRepository {
  constructor(
    @InjectRepository(PaymentIntent)
    private readonly paymentIntentRepository: Repository<PaymentIntent>,
    @InjectRepository(PaymentAttempt)
    private readonly paymentAttemptRepository: Repository<PaymentAttempt>,
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>
  ) {}

  async createPaymentIntent(payment: PaymentIntent): Promise<PaymentIntent> {
    return await this.paymentIntentRepository.save(payment);
  }

  async updatePaymentIntent(payment: PaymentIntent): Promise<PaymentIntent> {
    await this.paymentIntentRepository.save(payment);
    return await this.findPaymentById(payment.id);
  }

  async findPaymentById(id: number): Promise<PaymentIntent> {
    return await this.paymentIntentRepository.findOne({
      where: { id },
      relations: ['attempts', 'refunds']
    });
  }

  async findPaymentByBookingId(bookingId: number): Promise<PaymentIntent> {
    return await this.paymentIntentRepository.findOne({
      where: { bookingId },
      relations: ['attempts', 'refunds']
    });
  }

  async findPaymentByCode(paymentCode: string): Promise<PaymentIntent> {
    return await this.paymentIntentRepository.findOne({
      where: { paymentCode },
      relations: ['attempts', 'refunds']
    });
  }

  async findPaymentByProviderTxnId(providerTxnId: string): Promise<PaymentIntent> {
    return await this.paymentIntentRepository.findOne({
      where: { providerTxnId },
      relations: ['attempts', 'refunds']
    });
  }

  async createAttempt(attempt: PaymentAttempt): Promise<PaymentAttempt> {
    return await this.paymentAttemptRepository.save(attempt);
  }

  async createRefund(refund: Refund): Promise<Refund> {
    return await this.refundRepository.save(refund);
  }

  async findExpiredCandidates(now: Date): Promise<PaymentIntent[]> {
    return await this.paymentIntentRepository.find({
      where: {
        expiresAt: LessThanOrEqual(now),
        paymentStatus: In([PaymentStatus.PENDING, PaymentStatus.PROCESSING, PaymentStatus.FAILED])
      },
      relations: ['attempts', 'refunds']
    });
  }
}
