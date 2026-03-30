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
import { DataSource } from 'typeorm';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { IBookingRepository } from '@/data/repositories/booking.repository';
import { IFlightClient } from '@/booking/http-client/services/flight/flight.client';
import { IPaymentClient } from '@/booking/http-client/services/payment/payment.client';
import { Booking } from '@/booking/entities/booking.entity';
import { Role } from 'building-blocks/contracts/identity.contract';
import { FlightStatus, SeatReleaseReason } from 'building-blocks/contracts/flight.contract';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { PaymentStatus } from 'building-blocks/contracts/payment.contract';
import { BookingSeatWorkflowService } from '@/booking/services/booking-seat-workflow.service';

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
    private readonly dataSource: DataSource,
    private readonly bookingSeatWorkflowService: BookingSeatWorkflowService
  ) {}

  async execute(command: CancelBooking): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const bookingQuery = manager
        .getRepository(Booking)
        .createQueryBuilder('booking')
        .setLock('pessimistic_write')
        .where('booking.id = :id', { id: command.id });

      if (!command.isAdmin && typeof command.currentUserId === 'number') {
        bookingQuery.andWhere('booking.userId = :userId', {
          userId: command.currentUserId
        });
      }

      const booking = await bookingQuery.getOne();

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

      const canceledAt = new Date();
      const payment = booking.paymentId ? await this.tryGetPayment(booking.paymentId) : null;
      const canceledBooking = await this.bookingSeatWorkflowService.cancelBooking(manager, booking, canceledAt);

      if (booking.bookingStatus === BookingStatus.PENDING_PAYMENT) {
        await this.bookingSeatWorkflowService.enqueuePendingSeatRelease(
          manager,
          canceledBooking,
          SeatReleaseReason.BOOKING_CANCELED,
          canceledAt
        );
      } else {
        await this.bookingSeatWorkflowService.enqueueConfirmedSeatRelease(
          manager,
          canceledBooking,
          SeatReleaseReason.BOOKING_CANCELED,
          canceledAt
        );
      }

      if (payment && payment.paymentStatus === PaymentStatus.SUCCEEDED) {
        await this.bookingSeatWorkflowService.enqueueRefund(
          manager,
          canceledBooking,
          'Booking canceled by user',
          canceledAt
        );
      }
    });
  }

  private async tryGetPayment(paymentId: number) {
    try {
      return await this.paymentClient.getPaymentById(paymentId);
    } catch {
      return null;
    }
  }
}
