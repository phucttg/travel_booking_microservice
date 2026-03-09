import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitmqModule } from 'building-blocks/rabbitmq/rabbitmq.module';
import { Booking } from '@/booking/entities/booking.entity';
import { BookingRepository } from '@/data/repositories/booking.repository';
import { PassengerClient } from '@/booking/http-client/services/passenger/passenger-client';
import { FlightClient } from '@/booking/http-client/services/flight/flight.client';
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

@Module({
  imports: [CqrsModule, RabbitmqModule.forRoot(), TypeOrmModule.forFeature([Booking])],
  controllers: [CreateBookingController, GetBookingsController, GetBookingByIdController, CancelBookingController],
  providers: [
    CreateBookingHandler,
    GetBookingsHandler,
    GetBookingByIdHandler,
    CancelBookingHandler,
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
    }
  ],
  exports: []
})
export class BookingModule {}
