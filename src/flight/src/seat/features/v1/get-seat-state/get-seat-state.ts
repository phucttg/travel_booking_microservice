import { ISeatRepository } from '@/data/repositories/seatRepository';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Controller, Get, Inject, NotFoundException, Query } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { SeatStateDto } from '@/seat/dtos/seat-state.dto';
import { SeatStateQueryDto } from '@/seat/dtos/seat-state-query.dto';
import { Seat } from '@/seat/entities/seat.entity';

export class GetSeatState {
  flightId: number;
  seatNumber: string;

  constructor(request: Partial<GetSeatState> = {}) {
    Object.assign(this, request);
  }
}

@Controller({
  path: `/seat`,
  version: '1'
})
export class GetSeatStateController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-state')
  @ApiExcludeEndpoint()
  public async getSeatState(@Query() query: SeatStateQueryDto): Promise<SeatStateDto> {
    return await this.queryBus.execute(
      new GetSeatState({
        flightId: query.flightId,
        seatNumber: query.seatNumber
      })
    );
  }
}

@QueryHandler(GetSeatState)
export class GetSeatStateHandler implements IQueryHandler<GetSeatState> {
  constructor(@Inject('ISeatRepository') private readonly seatRepository: ISeatRepository) {}

  async execute(query: GetSeatState): Promise<SeatStateDto> {
    const seat = await this.seatRepository.findSeatByFlightIdAndSeatNumber(query.flightId, query.seatNumber);

    if (!seat) {
      throw new NotFoundException('Seat not found');
    }

    return new SeatStateDto({
      id: seat.id,
      seatNumber: seat.seatNumber,
      flightId: seat.flightId,
      seatState: seat.seatState,
      isReserved: seat.isReserved,
      holdExpiresAt: seat.holdExpiresAt,
      reservedBookingId: seat.reservedBookingId,
      updatedAt: seat.updatedAt
    });
  }
}
