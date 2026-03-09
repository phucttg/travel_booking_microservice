import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { BookingDto } from '@/booking/dtos/booking.dto';
import { IBookingRepository } from '@/data/repositories/booking.repository';
import { Booking } from '@/booking/entities/booking.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { PagedResult } from 'building-blocks/types/pagination/paged-result';
import mapper from '@/booking/mappings';
import { GetBookingsQueryDto } from '@/booking/dtos/get-bookings-query.dto';
import { Request } from 'express';
import { Role } from 'building-blocks/contracts/identity.contract';

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
        currentUserId,
        isAdmin: Number(request.user?.role) === Role.ADMIN
      })
    );
  }
}

@QueryHandler(GetBookings)
export class GetBookingsHandler implements IQueryHandler<GetBookings> {
  constructor(@Inject('IBookingRepository') private readonly bookingRepository: IBookingRepository) {}

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

    const result = bookingsEntity.map((booking) =>
      mapper.map<Booking, BookingDto>(booking, new BookingDto())
    );

    return new PagedResult<BookingDto[] | null>(result, total);
  }
}
