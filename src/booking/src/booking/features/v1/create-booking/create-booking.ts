import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  BadRequestException,
  Body,
  ConflictException,
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
import { BookingCheckoutDto } from '@/booking/dtos/booking-checkout.dto';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { Request, Response } from 'express';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { IFlightClient } from '@/booking/http-client/services/flight/flight.client';
import { IPassengerClient } from '@/booking/http-client/services/passenger/passenger-client';
import { IBookingRepository } from '@/data/repositories/booking.repository';
import { Booking } from '@/booking/entities/booking.entity';
import { CreateBookingRequestDto } from '@/booking/dtos/create-booking-request.dto';
import {
  FlightStatus,
  SeatReleaseReason,
  SeatReleaseRequested
} from 'building-blocks/contracts/flight.contract';
import { RequestContext } from 'building-blocks/context/context';
import {
  CreatePaymentIntentRequestDto,
  PaymentDto
} from 'building-blocks/contracts/payment.contract';
import { IIdempotencyRepository } from '@/booking/repositories/idempotency.repository';
import { IdempotencyRecord } from '@/booking/entities/idempotency-record.entity';
import { createRequestHash } from '@/booking/utils/request-hash';
import { IPaymentClient } from '@/booking/http-client/services/payment/payment.client';
import { toBookingDto } from '@/booking/utils/booking-dto';

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
  idempotencyKey: string;

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
  ): Promise<BookingCheckoutDto> {
    const currentUserId = Number(httpRequest.user?.userId);
    const idempotencyKey = httpRequest.headers['idempotency-key'];

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const result = await this.commandBus.execute(
      new CreateBooking({
        currentUserId,
        idempotencyKey,
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
    @Inject('IPaymentClient') private paymentClient: IPaymentClient,
    @Inject('IIdempotencyRepository') private idempotencyRepository: IIdempotencyRepository,
    @Inject('IRabbitmqPublisher') private rabbitmqPublisher: IRabbitmqPublisher
  ) {}

  async execute(command: CreateBooking): Promise<BookingCheckoutDto> {
    const requestHash = createRequestHash({
      currentUserId: command.currentUserId,
      flightId: command.flightId,
      description: command.description,
      seatNumber: command.seatNumber
    });
    const idempotencyScope = 'booking-create';
    const existingIdempotencyRecord = await this.idempotencyRepository.findByScopeAndKey(
      idempotencyScope,
      command.idempotencyKey
    );

    if (existingIdempotencyRecord) {
      if (existingIdempotencyRecord.requestHash !== requestHash) {
        throw new ConflictException({
          message: 'Idempotency key is already used for another booking request',
          code: 'IDEMPOTENCY_KEY_REUSED'
        });
      }

      return JSON.parse(existingIdempotencyRecord.responseBody) as BookingCheckoutDto;
    }

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

    const existingActiveBooking = await this.bookingRepository.findActiveBookingByUserAndFlight(
      command.currentUserId,
      flightDto.id
    );

    if (existingActiveBooking) {
      const existingPayment = await this.tryGetPayment(existingActiveBooking.paymentId);
      throw new ConflictException({
        message: 'An active booking already exists for this flight',
        code: 'ACTIVE_BOOKING_EXISTS',
        existingBookingId: existingActiveBooking.id,
        existingPaymentId: existingActiveBooking.paymentId,
        existingBookingStatus: existingActiveBooking.bookingStatus,
        existingPaymentStatus: existingPayment?.paymentStatus
      });
    }

    const reservedSeat = await this.flightClient.reserveSeat({
      seatNumber: command.seatNumber,
      flightId: flightDto?.id
    });
    const paymentExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    let bookingEntity: Booking;
    try {
      bookingEntity = await this.bookingRepository.createBooking(
        new Booking({
          flightId: flightDto?.id,
          seatNumber: reservedSeat.seatNumber,
          flightNumber: flightDto?.flightNumber,
          price: reservedSeat.price,
          currency: reservedSeat.currency || 'VND',
          passengerName: passengerDto?.name,
          description: command.description,
          flightDate: flightDto?.flightDate,
          aircraftId: flightDto?.aircraftId,
          departureAirportId: flightDto?.departureAirportId,
          arriveAirportId: flightDto?.arriveAirportId,
          userId: command.currentUserId,
          passengerId: passengerDto.id,
          seatClass: reservedSeat.seatClass,
          bookingStatus: BookingStatus.PENDING_PAYMENT,
          paymentExpiresAt
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

      const duplicateBooking = await this.bookingRepository.findActiveBookingByUserAndFlight(
        command.currentUserId,
        flightDto.id
      );

      if (duplicateBooking) {
        throw new ConflictException({
          message: 'An active booking already exists for this flight',
          code: 'ACTIVE_BOOKING_EXISTS',
          existingBookingId: duplicateBooking.id,
          existingPaymentId: duplicateBooking.paymentId,
          existingBookingStatus: duplicateBooking.bookingStatus
        });
      }

      throw error;
    }

    try {
      const payment = await this.paymentClient.createPaymentIntent(
        new CreatePaymentIntentRequestDto({
          bookingId: bookingEntity.id,
          userId: command.currentUserId,
          amount: bookingEntity.price,
          currency: bookingEntity.currency,
          expiresAt: paymentExpiresAt
        })
      );

      bookingEntity = await this.bookingRepository.updateBooking(
        new Booking({
          ...bookingEntity,
          paymentId: payment.id,
          paymentExpiresAt
        })
      );

      const response = new BookingCheckoutDto({
        booking: toBookingDto(bookingEntity, payment),
        payment
      });

      await this.idempotencyRepository.saveRecord(
        new IdempotencyRecord({
          scope: idempotencyScope,
          idempotencyKey: command.idempotencyKey,
          requestHash,
          userId: command.currentUserId,
          responseBody: JSON.stringify(response),
          statusCode: HttpStatus.CREATED
        })
      );

      return response;
    } catch (error) {
      await this.bookingRepository.updateBooking(
        new Booking({
          ...bookingEntity,
          bookingStatus: BookingStatus.EXPIRED,
          expiredAt: new Date(),
          updatedAt: new Date()
        })
      );

      await this.rabbitmqPublisher.publishMessage(
        new SeatReleaseRequested({
          bookingId: bookingEntity.id,
          flightId: flightDto.id,
          seatNumber: bookingEntity.seatNumber,
          reason: SeatReleaseReason.PAYMENT_INTENT_CREATE_FAILED,
          requestedAt: new Date()
        })
      );

      throw error;
    }
  }

  private async tryGetPayment(paymentId?: number | null): Promise<PaymentDto | null> {
    if (!paymentId) {
      return null;
    }

    try {
      return await this.paymentClient.getPaymentById(paymentId);
    } catch {
      return null;
    }
  }
}
