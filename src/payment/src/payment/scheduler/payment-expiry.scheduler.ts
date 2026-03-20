import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { IPaymentRepository } from '@/payment/repositories/payment.repository';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { PaymentExpired, PaymentStatus } from 'building-blocks/contracts/payment.contract';

@Injectable()
export class PaymentExpiryScheduler implements OnModuleInit, OnModuleDestroy {
  private intervalRef?: NodeJS.Timeout;

  constructor(
    @Inject('IPaymentRepository') private readonly paymentRepository: IPaymentRepository,
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher
  ) {}

  onModuleInit(): void {
    const sweepMs = Number(process.env.PAYMENT_EXPIRY_SWEEP_MS || 60000);

    this.intervalRef = setInterval(async () => {
      await this.expirePendingPayments();
    }, sweepMs);

    void this.expirePendingPayments();
  }

  onModuleDestroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  private async expirePendingPayments(): Promise<void> {
    const expiredCandidates = await this.paymentRepository.findExpiredCandidates(new Date());

    for (const payment of expiredCandidates) {
      if (payment.paymentStatus === PaymentStatus.EXPIRED) {
        continue;
      }

      payment.paymentStatus = PaymentStatus.EXPIRED;
      payment.updatedAt = new Date();

      const updatedPayment = await this.paymentRepository.updatePaymentIntent(payment);

      try {
        await this.rabbitmqPublisher.publishMessage(
          new PaymentExpired({
            paymentId: updatedPayment.id,
            bookingId: updatedPayment.bookingId,
            userId: updatedPayment.userId,
            occurredAt: new Date()
          })
        );
      } catch (error) {
        Logger.error(error);
      }
    }
  }
}
