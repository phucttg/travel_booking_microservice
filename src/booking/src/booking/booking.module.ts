import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitmqModule } from 'building-blocks/rabbitmq/rabbitmq.module';
import { Booking } from '@/booking/entities/booking.entity';
import { BookingRepository } from '@/data/repositories/booking.repository';
import { PassengerClient } from '@/booking/http-client/services/passenger/passenger-client';
import { FlightClient } from '@/booking/http-client/services/flight/flight.client';
import { PaymentClient } from '@/booking/http-client/services/payment/payment.client';
import {
  CreateBookingController,
  CreateBookingHandler
} from '@/booking/features/v1/create-booking/create-booking';
import {
  GetBookingsController,
  GetBookingsHandler
} from '@/booking/features/v1/get-bookings/get-bookings';
import {
  GetBookingByIdController,
  GetBookingByIdHandler
} from '@/booking/features/v1/get-booking-by-id/get-booking-by-id';
import {
  CancelBookingController,
  CancelBookingHandler
} from '@/booking/features/v1/cancel-booking/cancel-booking';
import { IdempotencyRecord } from '@/booking/entities/idempotency-record.entity';
import { ProcessedMessage } from '@/booking/entities/processed-message.entity';
import { IdempotencyRepository } from '@/booking/repositories/idempotency.repository';
import { ProcessedMessageRepository } from '@/booking/repositories/processed-message.repository';
import { PaymentSucceeded } from 'building-blocks/contracts/payment.contract';
import { PaymentExpired } from 'building-blocks/contracts/payment.contract';
import { IRabbitmqConsumer } from 'building-blocks/rabbitmq/rabbitmq-subscriber';
import { PaymentSucceededConsumerHandler } from '@/booking/consumers/payment-succeeded.consumer';
import { PaymentExpiredConsumerHandler } from '@/booking/consumers/payment-expired.consumer';

@Module({
  imports: [
    CqrsModule,
    RabbitmqModule.forRoot(),
    TypeOrmModule.forFeature([Booking, IdempotencyRecord, ProcessedMessage])
  ],
  controllers: [CreateBookingController, GetBookingsController, GetBookingByIdController, CancelBookingController],
  providers: [
    CreateBookingHandler,
    GetBookingsHandler,
    GetBookingByIdHandler,
    CancelBookingHandler,
    PaymentSucceededConsumerHandler,
    PaymentExpiredConsumerHandler,
    {
      provide: 'IBookingRepository',
      useClass: BookingRepository
    },
    {
      provide: 'IPassengerClient',
      useClass: PassengerClient
    },
    {
      provide: 'IFlightClient',
      useClass: FlightClient
    },
    {
      provide: 'IPaymentClient',
      useClass: PaymentClient
    },
    {
      provide: 'IIdempotencyRepository',
      useClass: IdempotencyRepository
    },
    {
      provide: 'IProcessedMessageRepository',
      useClass: ProcessedMessageRepository
    }
  ],
  exports: []
})
export class BookingModule implements OnApplicationBootstrap {
  constructor(
    @Inject('IRabbitmqConsumer') private readonly rabbitmqConsumer: IRabbitmqConsumer,
    private readonly paymentSucceededConsumerHandler: PaymentSucceededConsumerHandler,
    private readonly paymentExpiredConsumerHandler: PaymentExpiredConsumerHandler
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.rabbitmqConsumer.consumeMessage(
      PaymentSucceeded,
      this.paymentSucceededConsumerHandler.handle.bind(this.paymentSucceededConsumerHandler)
    );
    await this.rabbitmqConsumer.consumeMessage(
      PaymentExpired,
      this.paymentExpiredConsumerHandler.handle.bind(this.paymentExpiredConsumerHandler)
    );
  }
}
