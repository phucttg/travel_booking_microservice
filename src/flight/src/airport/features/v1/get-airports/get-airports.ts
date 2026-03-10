import { IAirportRepository } from '@/data/repositories/airportRepository';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { AirportDto } from '@/airport/dtos/airport.dto';
import { Airport } from '@/airport/entities/airport.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import mapper from '@/airport/mappings';

export class GetAirports {
  constructor(request: Partial<GetAirports> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Airports')
@Controller({
  path: `/airport`,
  version: '1'
})
export class GetAirportsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-all')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  public async getAirports(): Promise<AirportDto[]> {
    const result = await this.queryBus.execute(new GetAirports());

    return result;
  }
}

@QueryHandler(GetAirports)
export class GetAirportsHandler implements IQueryHandler<GetAirports> {
  constructor(@Inject('IAirportRepository') private readonly airportRepository: IAirportRepository) {}

  async execute(): Promise<AirportDto[]> {
    const airportsEntity = await this.airportRepository.findAirportsOrderedByName();

    return airportsEntity.map((airport) => mapper.map<Airport, AirportDto>(airport, new AirportDto()));
  }
}
