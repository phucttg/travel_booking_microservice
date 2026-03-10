import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, NotFoundException, Query, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { AircraftDto } from '@/aircraft/dtos/aircraft.dto';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { IAircraftRepository } from '@/data/repositories/aircraftRepository';
import { Aircraft } from '@/aircraft/entities/aircraft.entity';
import mapper from '@/aircraft/mappings';
import { AircraftIdQueryDto } from '@/aircraft/dtos/aircraft-id-query.dto';

export class GetAircraftById {
  id: number;

  constructor(request: Partial<GetAircraftById> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Aircrafts')
@Controller({
  path: `/aircraft`,
  version: '1'
})
export class GetAircraftByIdController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-by-id')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  public async getAircraftById(@Query() query: AircraftIdQueryDto): Promise<AircraftDto> {
    const result = await this.queryBus.execute(new GetAircraftById({ id: query.id }));

    if (!result) {
      throw new NotFoundException('Aircraft not found');
    }

    return result;
  }
}

@QueryHandler(GetAircraftById)
export class GetAircraftByIdHandler implements IQueryHandler<GetAircraftById> {
  constructor(
    @Inject('IAircraftRepository') private readonly aircraftRepository: IAircraftRepository
  ) {}

  async execute(query: GetAircraftById): Promise<AircraftDto> {
    const aircraftEntity = await this.aircraftRepository.findAircraftById(query.id);

    if (!aircraftEntity) {
      throw new NotFoundException('Aircraft not found');
    }

    return mapper.map<Aircraft, AircraftDto>(aircraftEntity, new AircraftDto());
  }
}
