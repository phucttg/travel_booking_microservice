import { IFlightRepository } from '@/data/repositories/flightRepository';
import { FlightDto } from '@/flight/dtos/flight.dto';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { PagedResult } from 'building-blocks/types/pagination/paged-result';
import { Flight } from '@/flight/entities/flight.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import mapper from '@/flight/mappings';
import { GetFlightsQueryDto } from '@/flight/dtos/get-flights-query.dto';
import { getEffectiveFlightStatus } from '@/flight/utils/flight-status';

export class GetFlights {
  page = 1;
  pageSize = 10;
  orderBy = 'id';
  order: 'ASC' | 'DESC' = 'ASC';
  searchTerm?: string = null;

  constructor(request: Partial<GetFlights> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Flights')
@Controller({
  path: `/flight`,
  version: '1'
})
export class GetFlightsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-all')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'], example: 'ASC' })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: ['id', 'flightNumber', 'price', 'flightDate'],
    example: 'id'
  })
  @ApiQuery({ name: 'searchTerm', required: false, type: String })
  public async getFlights(@Query() query: GetFlightsQueryDto): Promise<PagedResult<FlightDto[] | null>> {
    return await this.queryBus.execute(new GetFlights(query));
  }
}

@QueryHandler(GetFlights)
export class GetFlightsHandler implements IQueryHandler<GetFlights> {
  constructor(@Inject('IFlightRepository') private readonly flightRepository: IFlightRepository) {}

  async execute(query: GetFlights): Promise<PagedResult<FlightDto[] | null>> {
    const normalizedSearchTerm = query.searchTerm || null;

    const [flightsEntity, total] = await this.flightRepository.findFlights(
      query.page,
      query.pageSize,
      query.orderBy,
      query.order,
      normalizedSearchTerm
    );

    if (flightsEntity?.length === 0) {
      return new PagedResult<FlightDto[] | null>(null, total);
    }

    const result = flightsEntity.map((flight) => {
      const dto = mapper.map<Flight, FlightDto>(flight, new FlightDto());
      dto.flightStatus = getEffectiveFlightStatus(flight);

      return dto;
    });

    return new PagedResult<FlightDto[] | null>(result, total);
  }
}
