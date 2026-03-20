import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitmqModule } from 'building-blocks/rabbitmq/rabbitmq.module';
import { IRabbitmqConsumer } from 'building-blocks/rabbitmq/rabbitmq-subscriber';
import { PaymentRefundRequested } from 'building-blocks/contracts/payment.contract';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';
import { PaymentAttempt } from '@/payment/entities/payment-attempt.entity';
import { Refund } from '@/payment/entities/refund.entity';
import { IdempotencyRecord } from '@/payment/entities/idempotency-record.entity';
import { ProcessedMessage } from '@/payment/entities/processed-message.entity';
import { Wallet } from '@/payment/entities/wallet.entity';
import { WalletTopupRequest } from '@/payment/entities/wallet-topup-request.entity';
import { WalletLedger } from '@/payment/entities/wallet-ledger.entity';
import { PaymentRepository } from '@/payment/repositories/payment.repository';
import { IdempotencyRepository } from '@/payment/repositories/idempotency.repository';
import { ProcessedMessageRepository } from '@/payment/repositories/processed-message.repository';
import {
  CreatePaymentIntentController,
  CreatePaymentIntentHandler
} from '@/payment/features/v1/create-payment-intent/create-payment-intent';
import {
  ConfirmPaymentController,
  ConfirmPaymentHandler
} from '@/payment/features/v1/confirm-payment/confirm-payment';
import {
  ManualReconcilePaymentController,
  ManualReconcilePaymentHandler
} from '@/payment/features/v1/reconcile-manual/reconcile-manual';
import {
  GetPaymentByIdController,
  GetPaymentByIdHandler
} from '@/payment/features/v1/get-payment-by-id/get-payment-by-id';
import {
  GetPaymentByBookingIdController,
  GetPaymentByBookingIdHandler
} from '@/payment/features/v1/get-payment-by-booking-id/get-payment-by-booking-id';
import { PaymentRefundRequestedConsumerHandler } from '@/payment/consumers/payment-refund-requested.consumer';
import { PaymentExpiryScheduler } from '@/payment/scheduler/payment-expiry.scheduler';
import {
  ApproveWalletTopupRequestHandler,
  CreateWalletTopupRequestHandler,
  GetMyWalletHandler,
  GetMyWalletTopupRequestsHandler,
  GetWalletTopupRequestsHandler,
  PayBookingWithWalletHandler,
  RejectWalletTopupRequestHandler,
  WalletController
} from '@/payment/features/v1/wallet/wallet';

@Module({
  imports: [
    CqrsModule,
    RabbitmqModule.forRoot(),
    TypeOrmModule.forFeature([
      PaymentIntent,
      PaymentAttempt,
      Refund,
      IdempotencyRecord,
      ProcessedMessage,
      Wallet,
      WalletTopupRequest,
      WalletLedger
    ])
  ],
  controllers: [
    CreatePaymentIntentController,
    ConfirmPaymentController,
    ManualReconcilePaymentController,
    GetPaymentByIdController,
    GetPaymentByBookingIdController,
    WalletController
  ],
  providers: [
    CreatePaymentIntentHandler,
    ConfirmPaymentHandler,
    ManualReconcilePaymentHandler,
    GetPaymentByIdHandler,
    GetPaymentByBookingIdHandler,
    GetMyWalletHandler,
    CreateWalletTopupRequestHandler,
    GetMyWalletTopupRequestsHandler,
    GetWalletTopupRequestsHandler,
    ApproveWalletTopupRequestHandler,
    RejectWalletTopupRequestHandler,
    PayBookingWithWalletHandler,
    PaymentRefundRequestedConsumerHandler,
    PaymentExpiryScheduler,
    {
      provide: 'IPaymentRepository',
      useClass: PaymentRepository
    },
    {
      provide: 'IIdempotencyRepository',
      useClass: IdempotencyRepository
    },
    {
      provide: 'IProcessedMessageRepository',
      useClass: ProcessedMessageRepository
    }
  ]
})
export class PaymentModule implements OnApplicationBootstrap {
  constructor(
    @Inject('IRabbitmqConsumer') private readonly rabbitmqConsumer: IRabbitmqConsumer,
    private readonly paymentRefundRequestedConsumerHandler: PaymentRefundRequestedConsumerHandler
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.rabbitmqConsumer.consumeMessage(
      PaymentRefundRequested,
      this.paymentRefundRequestedConsumerHandler.handle.bind(this.paymentRefundRequestedConsumerHandler)
    );
  }
}
