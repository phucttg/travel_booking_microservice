import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { BookingDto } from '@/booking/dtos/booking.dto';
import { IBookingRepository } from '@/data/repositories/booking.repository';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { PagedResult } from 'building-blocks/types/pagination/paged-result';
import { GetBookingsQueryDto } from '@/booking/dtos/get-bookings-query.dto';
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

export class GetBookings {
  page = 1;
  pageSize = 10;
  orderBy = 'id';
  order: 'ASC' | 'DESC' = 'DESC';
  includePaymentSummary = true;
  currentUserId?: number;
  isAdmin = false;

  constructor(request: Partial<GetBookings> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Bookings')
@Controller({
  path: `/booking`,
  version: '1'
})
export class GetBookingsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-all')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'], example: 'DESC' })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: ['id', 'createdAt', 'price', 'flightDate'],
    example: 'id'
  })
  @ApiQuery({ name: 'includePaymentSummary', required: false, type: Boolean, example: true })
  public async getBookings(
    @Query() query: GetBookingsQueryDto,
    @Req() request: JwtRequest
  ): Promise<PagedResult<BookingDto[] | null>> {
    const currentUserId = Number(request.user?.userId);

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return await this.queryBus.execute(
      new GetBookings({
        ...query,
        includePaymentSummary: query.includePaymentSummary ?? true,
        currentUserId,
        isAdmin: Number(request.user?.role) === Role.ADMIN
      })
    );
  }
}

type PaymentSummary = Awaited<ReturnType<IPaymentClient['getPaymentSummariesByIds']>>[number];

@QueryHandler(GetBookings)
export class GetBookingsHandler implements IQueryHandler<GetBookings> {
  constructor(
    @Inject('IBookingRepository') private readonly bookingRepository: IBookingRepository,
    @Inject('IPaymentClient') private readonly paymentClient: IPaymentClient
  ) {}

  async execute(query: GetBookings): Promise<PagedResult<BookingDto[] | null>> {
    const [bookingsEntity, total] = await this.bookingRepository.findBookings(
      query.page,
      query.pageSize,
      query.orderBy,
      query.order,
      query.isAdmin ? undefined : query.currentUserId
    );

    if (bookingsEntity?.length === 0) {
      return new PagedResult<BookingDto[] | null>(null, total);
    }

    if (!query.includePaymentSummary) {
      const result = bookingsEntity.map((booking) => toBookingDto(booking, null));
      return new PagedResult<BookingDto[] | null>(result, total);
    }

    const paymentIds = [...new Set(bookingsEntity.map((booking) => booking.paymentId).filter((id) => id > 0))];
    const paymentSummaryById = await this.tryGetPaymentSummaries(paymentIds);
    const result = bookingsEntity.map((booking) =>
      toBookingDto(booking, booking.paymentId ? (paymentSummaryById.get(booking.paymentId) ?? null) : null)
    );

    return new PagedResult<BookingDto[] | null>(result, total);
  }

  private async tryGetPaymentSummaries(paymentIds: number[]): Promise<Map<number, PaymentSummary>> {
    if (!paymentIds.length) {
      return new Map<number, PaymentSummary>();
    }

    try {
      const summaries = await this.paymentClient.getPaymentSummariesByIds(paymentIds);
      return new Map(summaries.map((summary) => [summary.id, summary]));
    } catch {
      return new Map<number, PaymentSummary>();
    }
  }
}
