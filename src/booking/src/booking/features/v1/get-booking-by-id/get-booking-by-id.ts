import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, NotFoundException, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { BookingDto } from '@/booking/dtos/booking.dto';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { IBookingRepository } from '@/data/repositories/booking.repository';
import { BookingIdQueryDto } from '@/booking/dtos/booking-id-query.dto';
import { Request } from 'express';
import { Role } from 'building-blocks/contracts/identity.contract';
import { IPaymentClient } from '@/booking/http-client/services/payment/payment.client';
import { toBookingDto } from '@/booking/utils/booking-dto';

type JwtRequest = Request & {
  user?: {
    userId?: number | string;
    role?: number | string;
  };
};

export class GetBookingById {
  id: number;
  currentUserId?: number;
  isAdmin = false;

  constructor(request: Partial<GetBookingById> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Bookings')
@Controller({
  path: `/booking`,
  version: '1'
})
export class GetBookingByIdController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-by-id')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  public async getBookingById(@Query() query: BookingIdQueryDto, @Req() request: JwtRequest): Promise<BookingDto> {
    const currentUserId = Number(request.user?.userId);

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const result = await this.queryBus.execute(
      new GetBookingById({
        id: query.id,
        currentUserId,
        isAdmin: Number(request.user?.role) === Role.ADMIN
      })
    );

    if (!result) {
      throw new NotFoundException('Booking not found');
    }

    return result;
  }
}

@QueryHandler(GetBookingById)
export class GetBookingByIdHandler implements IQueryHandler<GetBookingById> {
  constructor(
    @Inject('IBookingRepository') private readonly bookingRepository: IBookingRepository,
    @Inject('IPaymentClient') private readonly paymentClient: IPaymentClient
  ) {}

  async execute(query: GetBookingById): Promise<BookingDto> {
    const bookingEntity = await this.bookingRepository.findBookingById(
      query.id,
      query.isAdmin ? undefined : query.currentUserId
    );

    if (!bookingEntity) {
      throw new NotFoundException('Booking not found');
    }

    const paymentSummary = bookingEntity.paymentId ? await this.tryGetPayment(bookingEntity.paymentId) : null;
    return toBookingDto(bookingEntity, paymentSummary);
  }

  private async tryGetPayment(paymentId: number) {
    try {
      return await this.paymentClient.getPaymentById(paymentId);
    } catch {
      return null;
    }
  }
}
