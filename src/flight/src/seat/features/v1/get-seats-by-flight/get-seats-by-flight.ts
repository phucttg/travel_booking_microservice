import { ISeatRepository } from '@/data/repositories/seatRepository';
import { SeatDto } from '@/seat/dtos/seat.dto';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { Seat } from '@/seat/entities/seat.entity';
import mapper from '@/seat/mappings';
import { SeatFlightIdQueryDto } from '@/seat/dtos/seat-flight-id-query.dto';
import { calculateSeatPrice } from '@/seat/utils/seat-pricing';

export class GetSeatsByFlight {
  flightId: number;

  constructor(request: Partial<GetSeatsByFlight> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Seats')
@Controller({
  path: `/seat`,
  version: '1'
})
export class GetSeatsByFlightController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-by-flight-id')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  public async getSeatsByFlight(@Query() query: SeatFlightIdQueryDto): Promise<SeatDto[]> {
    return await this.queryBus.execute(new GetSeatsByFlight({ flightId: query.flightId }));
  }
}

@QueryHandler(GetSeatsByFlight)
export class GetSeatsByFlightHandler implements IQueryHandler<GetSeatsByFlight> {
  constructor(@Inject('ISeatRepository') private readonly seatRepository: ISeatRepository) {}

  async execute(query: GetSeatsByFlight): Promise<SeatDto[]> {
    const seatsEntity = await this.seatRepository.getSeatsByFlightIdAll(query.flightId);

    return seatsEntity.map((seat) => {
      const seatDto = mapper.map<Seat, SeatDto>(seat, new SeatDto());
      seatDto.price = calculateSeatPrice(seat.flight?.price || 0, seat.seatClass);
      seatDto.currency = 'VND';
      return seatDto;
    });
  }
}
