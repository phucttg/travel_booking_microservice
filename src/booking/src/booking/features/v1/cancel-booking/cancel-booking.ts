import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ConflictException,
  Controller,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Req,
  Res,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Request, Response } from 'express';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { IBookingRepository } from '@/data/repositories/booking.repository';
import { IFlightClient } from '@/booking/http-client/services/flight/flight.client';
import { IPaymentClient } from '@/booking/http-client/services/payment/payment.client';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { Booking } from '@/booking/entities/booking.entity';
import { Role } from 'building-blocks/contracts/identity.contract';
import { FlightStatus, SeatReleaseReason, SeatReleaseRequested } from 'building-blocks/contracts/flight.contract';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { PaymentRefundRequested, PaymentStatus } from 'building-blocks/contracts/payment.contract';

type JwtRequest = Request & {
  user?: {
    userId?: number | string;
    role?: number | string;
  };
};

export class CancelBooking {
  id: number;
  currentUserId?: number;
  isAdmin = false;

  constructor(request: Partial<CancelBooking> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Bookings')
@Controller({
  path: `/booking`,
  version: '1'
})
export class CancelBookingController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch('cancel/:id')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 204, description: 'NO_CONTENT' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  public async cancelBooking(
    @Param('id') id: string,
    @Req() request: JwtRequest,
    @Res() res: Response
  ): Promise<void> {
    const currentUserId = Number(request.user?.userId);

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    await this.commandBus.execute(
      new CancelBooking({
        id: Number(id),
        currentUserId,
        isAdmin: Number(request.user?.role) === Role.ADMIN
      })
    );

    res.status(HttpStatus.NO_CONTENT).send(null);
  }
}

@CommandHandler(CancelBooking)
export class CancelBookingHandler implements ICommandHandler<CancelBooking> {
  constructor(
    @Inject('IBookingRepository') private readonly bookingRepository: IBookingRepository,
    @Inject('IFlightClient') private readonly flightClient: IFlightClient,
    @Inject('IPaymentClient') private readonly paymentClient: IPaymentClient,
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher
  ) {}

  async execute(command: CancelBooking): Promise<void> {
    const booking = await this.bookingRepository.findBookingById(
      command.id,
      command.isAdmin ? undefined : command.currentUserId
    );

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!booking.flightId) {
      throw new ConflictException('Legacy bookings cannot be canceled automatically');
    }

    if ([BookingStatus.CANCELED, BookingStatus.EXPIRED].includes(booking.bookingStatus)) {
      return;
    }

    const flight = await this.flightClient.getFlightById(booking.flightId);

    if ([FlightStatus.COMPLETED, FlightStatus.FLYING].includes(flight.flightStatus)) {
      throw new ConflictException('Booking can no longer be canceled');
    }

    const payment = booking.paymentId ? await this.tryGetPayment(booking.paymentId) : null;
    const canceledBooking = new Booking({
      ...booking,
      bookingStatus: BookingStatus.CANCELED,
      canceledAt: new Date(),
      updatedAt: new Date()
    });

    await this.bookingRepository.updateBooking(canceledBooking);
    await this.publishSeatRelease(canceledBooking, SeatReleaseReason.BOOKING_CANCELED);

    if (payment && payment.paymentStatus === PaymentStatus.SUCCEEDED) {
      await this.rabbitmqPublisher.publishMessage(
        new PaymentRefundRequested({
          paymentId: payment.id,
          bookingId: canceledBooking.id,
          userId: canceledBooking.userId,
          amount: canceledBooking.price,
          currency: canceledBooking.currency,
          reason: 'Booking canceled by user',
          requestedAt: new Date()
        })
      );
    }
  }

  private async publishSeatRelease(booking: Booking, reason: SeatReleaseReason): Promise<void> {
    await this.rabbitmqPublisher.publishMessage(
      new SeatReleaseRequested({
        bookingId: booking.id,
        flightId: booking.flightId,
        seatNumber: booking.seatNumber,
        reason,
        requestedAt: new Date()
      })
    );
  }

  private async tryGetPayment(paymentId: number) {
    try {
      return await this.paymentClient.getPaymentById(paymentId);
    } catch {
      return null;
    }
  }
}
