import { AirportDto } from '@/airport/dtos/airport.dto';
import { IAirportRepository } from '@/data/repositories/airportRepository';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, NotFoundException, Query, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Airport } from '@/airport/entities/airport.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import mapper from '@/airport/mappings';
import { AirportIdQueryDto } from '@/airport/dtos/airport-id-query.dto';

export class GetAirportById {
  id: number;

  constructor(request: Partial<GetAirportById> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Airports')
@Controller({
  path: `/airport`,
  version: '1'
})
export class GetAirportByIdController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-by-id')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  public async getAirportById(@Query() query: AirportIdQueryDto): Promise<AirportDto> {
    const result = await this.queryBus.execute(new GetAirportById({ id: query.id }));

    if (!result) {
      throw new NotFoundException('Airport not found');
    }

    return result;
  }
}

@QueryHandler(GetAirportById)
export class GetAirportByIdHandler implements IQueryHandler<GetAirportById> {
  constructor(@Inject('IAirportRepository') private readonly airportRepository: IAirportRepository) {}

  async execute(query: GetAirportById): Promise<AirportDto> {
    const airportEntity = await this.airportRepository.findAirportById(query.id);

    if (!airportEntity) {
      throw new NotFoundException('Airport not found');
    }

    return mapper.map<Airport, AirportDto>(airportEntity, new AirportDto());
  }
}
