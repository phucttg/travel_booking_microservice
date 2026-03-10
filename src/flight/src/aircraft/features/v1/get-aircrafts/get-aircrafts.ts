import { IAircraftRepository } from '@/data/repositories/aircraftRepository';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { AircraftDto } from '@/aircraft/dtos/aircraft.dto';
import { Aircraft } from '@/aircraft/entities/aircraft.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import mapper from '@/aircraft/mappings';

export class GetAircrafts {
  constructor(request: Partial<GetAircrafts> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Aircrafts')
@Controller({
  path: `/aircraft`,
  version: '1'
})
export class GetAircraftsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-all')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  public async getAircrafts(): Promise<AircraftDto[]> {
    const result = await this.queryBus.execute(new GetAircrafts());

    return result;
  }
}

@QueryHandler(GetAircrafts)
export class GetAircraftsHandler implements IQueryHandler<GetAircrafts> {
  constructor(@Inject('IAircraftRepository') private readonly aircraftRepository: IAircraftRepository) {}

  async execute(): Promise<AircraftDto[]> {
    const aircraftsEntity = await this.aircraftRepository.findAircraftsOrderedByName();

    return aircraftsEntity.map((aircraft) =>
      mapper.map<Aircraft, AircraftDto>(aircraft, new AircraftDto())
    );
  }
}
