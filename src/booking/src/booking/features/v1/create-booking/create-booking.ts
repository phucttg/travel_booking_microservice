import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BookingDto } from '@/booking/dtos/booking.dto';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { Request, Response } from 'express';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { IFlightClient } from '@/booking/http-client/services/flight/flight.client';
import { IPassengerClient } from '@/booking/http-client/services/passenger/passenger-client';
import { IBookingRepository } from '@/data/repositories/booking.repository';
import { Booking } from '@/booking/entities/booking.entity';
import { BookingCreated } from 'building-blocks/contracts/booking.contract';
import mapper from '@/booking/mappings';
import { CreateBookingRequestDto } from '@/booking/dtos/create-booking-request.dto';
import { FlightStatus, SeatReleaseReason, SeatReleaseRequested } from 'building-blocks/contracts/flight.contract';
import { RequestContext } from 'building-blocks/context/context';

type JwtRequest = Request & {
  user?: {
    userId?: number | string;
  };
};

export class CreateBooking {
  currentUserId: number;
  flightId: number;
  description: string;
  seatNumber?: string;

  constructor(request: Partial<CreateBooking> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Bookings')
@Controller({
  path: `/booking`,
  version: '1'
})
export class CreateBookingController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('create')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 201, description: 'CREATED' })
  public async createBooking(
    @Body() request: CreateBookingRequestDto,
    @Req() httpRequest: JwtRequest,
    @Res() res: Response
  ): Promise<BookingDto> {
    const currentUserId = Number(httpRequest.user?.userId);

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const result = await this.commandBus.execute(
      new CreateBooking({
        currentUserId,
        ...request
      })
    );

    res.status(HttpStatus.CREATED).send(result);

    return result;
  }
}

@CommandHandler(CreateBooking)
export class CreateBookingHandler implements ICommandHandler<CreateBooking> {
  constructor(
    @Inject('IBookingRepository') private bookingRepository: IBookingRepository,
    @Inject('IFlightClient') private flightClient: IFlightClient,
    @Inject('IPassengerClient') private passengerClient: IPassengerClient,
    @Inject('IRabbitmqPublisher') private rabbitmqPublisher: IRabbitmqPublisher
  ) {}

  async execute(command: CreateBooking): Promise<BookingDto> {
    const flightDto = await this.flightClient.getFlightById(command.flightId);
    const passengerDto = await this.passengerClient.getPassengerByUserId(command.currentUserId);

    if (!passengerDto) {
      throw new NotFoundException('Passenger not found');
    }

    if (![FlightStatus.SCHEDULED, FlightStatus.DELAY].includes(flightDto.flightStatus)) {
      throw new NotFoundException('Flight is no longer available for booking');
    }

    if (new Date(flightDto.departureDate) <= new Date()) {
      throw new NotFoundException('Flight is no longer available for booking');
    }

    const reservedSeat = await this.flightClient.reserveSeat({
      seatNumber: command.seatNumber,
      flightId: flightDto?.id
    });

    let bookingEntity: Booking;
    try {
      bookingEntity = await this.bookingRepository.createBooking(
        new Booking({
          flightId: flightDto?.id,
          seatNumber: reservedSeat.seatNumber,
          flightNumber: flightDto?.flightNumber,
          price: flightDto?.price,
          passengerName: passengerDto?.name,
          description: command.description,
          flightDate: flightDto?.flightDate,
          aircraftId: flightDto?.aircraftId,
          departureAirportId: flightDto?.departureAirportId,
          arriveAirportId: flightDto?.arriveAirportId,
          userId: command.currentUserId,
          passengerId: passengerDto.id,
          bookingStatus: BookingStatus.CONFIRMED
        })
      );
    } catch (error) {
      Logger.error(
        JSON.stringify({
          requestId: RequestContext.getRequestId(),
          flightId: flightDto?.id,
          seatNumber: reservedSeat.seatNumber,
          message: 'Booking creation failed after seat reservation'
        })
      );

      try {
        await this.rabbitmqPublisher.publishMessage(
          new SeatReleaseRequested({
            flightId: flightDto?.id,
            seatNumber: reservedSeat.seatNumber,
            reason: SeatReleaseReason.BOOKING_CREATE_FAILED,
            requestedAt: new Date()
          })
        );
      } catch (compensationError) {
        Logger.error(
          JSON.stringify({
            requestId: RequestContext.getRequestId(),
            flightId: flightDto?.id,
            seatNumber: reservedSeat.seatNumber,
            message: 'Failed to publish seat release compensation',
            error: compensationError instanceof Error ? compensationError.message : String(compensationError)
          })
        );
      }

      throw error;
    }

    await this.rabbitmqPublisher.publishMessage(new BookingCreated(bookingEntity));

    return mapper.map<Booking, BookingDto>(bookingEntity, new BookingDto());
  }
}
