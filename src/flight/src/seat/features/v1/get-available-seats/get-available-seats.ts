import { ISeatRepository } from '@/data/repositories/seatRepository';
import { SeatDto } from '@/seat/dtos/seat.dto';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { Seat } from '@/seat/entities/seat.entity';
import mapper from '@/seat/mappings';
import { SeatFlightIdQueryDto } from '@/seat/dtos/seat-flight-id-query.dto';

export class GetAvailableSeats {
  flightId: number;

  constructor(request: Partial<GetAvailableSeats> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Seats')
@Controller({
  path: `/seat`,
  version: '1'
})
export class GetAvailableSeatsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-available-seats')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  public async getAvailableSeats(@Query() query: SeatFlightIdQueryDto): Promise<SeatDto[]> {
    return await this.queryBus.execute(new GetAvailableSeats({ flightId: query.flightId }));
  }
}

@QueryHandler(GetAvailableSeats)
export class GetAvailableSeatsHandler implements IQueryHandler<GetAvailableSeats> {
  constructor(@Inject('ISeatRepository') private readonly seatRepository: ISeatRepository) {}

  async execute(query: GetAvailableSeats): Promise<SeatDto[]> {
    const seatsEntity = await this.seatRepository.getSeatsByFlightId(query.flightId);

    return seatsEntity.map((seat) => mapper.map<Seat, SeatDto>(seat, new SeatDto()));
  }
}
