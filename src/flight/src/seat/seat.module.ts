import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatRepository } from '@/data/repositories/seatRepository';
import { Seat } from '@/seat/entities/seat.entity';
import { ProcessedMessage } from '@/seat/entities/processed-message.entity';
import { Flight } from '@/flight/entities/flight.entity';
import { FlightRepository } from '@/data/repositories/flightRepository';
import { AircraftRepository } from '@/data/repositories/aircraftRepository';
import { Aircraft } from '@/aircraft/entities/aircraft.entity';
import { CreateSeatController, CreateSeatHandler } from '@/seat/features/v1/create-seat/create-seat';
import {
  GetAvailableSeatsController,
  GetAvailableSeatsHandler
} from '@/seat/features/v1/get-available-seats/get-available-seats';
import {
  GetSeatsByFlightController,
  GetSeatsByFlightHandler
} from '@/seat/features/v1/get-seats-by-flight/get-seats-by-flight';
import { ReserveSeatController, ReserveSeatHandler } from '@/seat/features/v1/reserve-seat/reserve-seat';
import {
  ReconcileMissingSeatsController,
  ReconcileMissingSeatsHandler
} from '@/seat/features/v1/reconcile-missing/reconcile-missing';
import { RabbitmqModule } from 'building-blocks/rabbitmq/rabbitmq.module';
import { RolesGuard } from '@/common/auth/roles.guard';
import { IRabbitmqConsumer } from 'building-blocks/rabbitmq/rabbitmq-subscriber';
import { SeatReleaseRequested } from 'building-blocks/contracts/flight.contract';
import { SeatReleaseRequestedConsumerHandler } from '@/seat/consumers/seat-release-requested.consumer';
import { ProcessedMessageRepository } from '@/data/repositories/processedMessageRepository';

@Module({
  imports: [
    CqrsModule,
    RabbitmqModule.forRoot(),
    TypeOrmModule.forFeature([Seat, Flight, Aircraft, ProcessedMessage])
  ],
  controllers: [
    CreateSeatController,
    GetAvailableSeatsController,
    GetSeatsByFlightController,
    ReserveSeatController,
    ReconcileMissingSeatsController
  ],
  providers: [
    CreateSeatHandler,
    GetAvailableSeatsHandler,
    GetSeatsByFlightHandler,
    ReserveSeatHandler,
    ReconcileMissingSeatsHandler,
    SeatReleaseRequestedConsumerHandler,
    RolesGuard,
    {
      provide: 'ISeatRepository',
      useClass: SeatRepository
    },
    {
      provide: 'IFlightRepository',
      useClass: FlightRepository
    },
    {
      provide: 'IAircraftRepository',
      useClass: AircraftRepository
    },
    {
      provide: 'IProcessedMessageRepository',
      useClass: ProcessedMessageRepository
    }
  ],
  exports: []
})
export class SeatModule implements OnApplicationBootstrap {
  constructor(
    @Inject('IRabbitmqConsumer') private readonly rabbitmqConsumer: IRabbitmqConsumer,
    private readonly seatReleaseRequestedConsumerHandler: SeatReleaseRequestedConsumerHandler
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.rabbitmqConsumer.consumeMessage(
      SeatReleaseRequested,
      this.seatReleaseRequestedConsumerHandler.handle.bind(this.seatReleaseRequestedConsumerHandler)
    );
  }
}
