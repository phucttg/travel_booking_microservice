import { IFlightRepository } from '@/data/repositories/flightRepository';
import { FlightDto } from '@/flight/dtos/flight.dto';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, NotFoundException, Query, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Flight } from '@/flight/entities/flight.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import mapper from '@/flight/mappings';
import { FlightIdQueryDto } from '@/flight/dtos/flight-id-query.dto';
import { getEffectiveFlightStatus } from '@/flight/utils/flight-status';

export class GetFlightById {
  id: number;

  constructor(request: Partial<GetFlightById> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Flights')
@Controller({
  path: `/flight`,
  version: '1'
})
export class GetFlightByIdController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-by-id')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  public async getFlightById(@Query() query: FlightIdQueryDto): Promise<FlightDto> {
    const result = await this.queryBus.execute(new GetFlightById({ id: query.id }));

    if (!result) {
      throw new NotFoundException('Flight not found');
    }

    return result;
  }
}

@QueryHandler(GetFlightById)
export class GetFlightByIdHandler implements IQueryHandler<GetFlightById> {
  constructor(@Inject('IFlightRepository') private readonly flightRepository: IFlightRepository) {}

  async execute(query: GetFlightById): Promise<FlightDto> {
    const flightEntity = await this.flightRepository.findFlightById(query.id);

    if (!flightEntity) {
      throw new NotFoundException('Flight not found');
    }

    const result = mapper.map<Flight, FlightDto>(flightEntity, new FlightDto());
    result.flightStatus = getEffectiveFlightStatus(flightEntity);

    return result;
  }
}
