import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RabbitmqMessageEnvelope } from 'building-blocks/contracts/message-envelope.contract';
import {
  PaymentRefundRequested,
  PaymentRefunded,
  PaymentStatus,
  RefundStatus
} from 'building-blocks/contracts/payment.contract';
import { Refund } from '@/payment/entities/refund.entity';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { IProcessedMessageRepository } from '@/payment/repositories/processed-message.repository';
import { Wallet } from '@/payment/entities/wallet.entity';
import { WalletLedger } from '@/payment/entities/wallet-ledger.entity';
import { WalletLedgerType } from '@/payment/enums/wallet-ledger-type.enum';
import { WalletLedgerReferenceType } from '@/payment/enums/wallet-ledger-reference-type.enum';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';

const WALLET_CURRENCY = 'VND';

@Injectable()
export class PaymentRefundRequestedConsumerHandler {
  constructor(
    @Inject('IProcessedMessageRepository') private readonly processedMessageRepository: IProcessedMessageRepository,
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher,
    private readonly dataSource: DataSource
  ) {}

  async handle(
    _queue: string,
    message: PaymentRefundRequested,
    envelope?: RabbitmqMessageEnvelope<PaymentRefundRequested> | null
  ): Promise<void> {
    const messageKey = envelope?.messageId || envelope?.idempotencyKey;
    const isFreshMessage = await this.processedMessageRepository.registerProcessedMessage(
      PaymentRefundRequestedConsumerHandler.name,
      messageKey
    );

    if (!isFreshMessage) {
      return;
    }

    const refundResult = await this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(PaymentIntent);
      const walletLedgerRepository = manager.getRepository(WalletLedger);
      const payment = await paymentRepository
        .createQueryBuilder('payment')
        .setLock('pessimistic_write')
        .where('payment.id = :id', { id: message.paymentId })
        .getOne();

      if (!payment || payment.paymentStatus !== PaymentStatus.SUCCEEDED) {
        return null;
      }

      if ([RefundStatus.PENDING, RefundStatus.SUCCEEDED].includes(payment.refundStatus)) {
        return null;
      }

      const now = new Date();
      const refundAmount = Number(message.amount || 0);
      const wallet = await this.ensureWalletForUpdate(manager, payment.userId);
      const balanceBefore = Number(wallet.balance || 0);
      const balanceAfter = balanceBefore + refundAmount;

      wallet.balance = balanceAfter;
      wallet.currency = WALLET_CURRENCY;
      wallet.updatedAt = now;
      await manager.getRepository(Wallet).save(wallet);

      const refund = await manager.getRepository(Refund).save(
        new Refund({
          paymentId: payment.id,
          amount: refundAmount,
          currency: message.currency,
          refundStatus: RefundStatus.SUCCEEDED,
          completedAt: now
        })
      );

      await walletLedgerRepository.save(
        new WalletLedger({
          userId: payment.userId,
          type: WalletLedgerType.BOOKING_REFUND,
          amount: refundAmount,
          currency: WALLET_CURRENCY,
          balanceBefore,
          balanceAfter,
          referenceType: WalletLedgerReferenceType.REFUND,
          referenceId: refund.id
        })
      );

      payment.refundStatus = RefundStatus.SUCCEEDED;
      payment.refundedAt = now;
      payment.updatedAt = now;
      await paymentRepository.save(payment);

      return {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        refundId: refund.id,
        userId: payment.userId,
        amount: refundAmount,
        currency: payment.currency,
        occurredAt: now
      };
    });

    if (!refundResult) {
      return;
    }

    await this.rabbitmqPublisher.publishMessage(new PaymentRefunded(refundResult));
  }

  private async ensureWalletForUpdate(manager: EntityManager, userId: number): Promise<Wallet> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(Wallet)
      .values(
        new Wallet({
          userId,
          balance: 0,
          currency: WALLET_CURRENCY
        })
      )
      .orIgnore()
      .execute();

    return await manager
      .getRepository(Wallet)
      .createQueryBuilder('wallet')
      .setLock('pessimistic_write')
      .where('wallet.userId = :userId', { userId })
      .getOne();
  }
}
