import { IAircraftRepository } from '@/data/repositories/aircraftRepository';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  ConflictException,
  Controller,
  HttpStatus,
  Inject,
  Post,
  Res,
  UseGuards
} from '@nestjs/common';
import { AircraftDto } from '@/aircraft/dtos/aircraft.dto';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Response } from 'express';
import { Aircraft } from '@/aircraft/entities/aircraft.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { AircraftCreated } from 'building-blocks/contracts/flight.contract';
import { Role } from 'building-blocks/contracts/identity.contract';
import { Roles } from '@/common/auth/roles.decorator';
import { RolesGuard } from '@/common/auth/roles.guard';
import mapper from '@/aircraft/mappings';
import { CreateAircraftRequestDto } from '@/aircraft/dtos/create-aircraft-request.dto';

export class CreateAircraft {
  model: string;
  name: string;
  manufacturingYear: number;

  constructor(request: Partial<CreateAircraft> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Aircrafts')
@Controller({
  path: `/aircraft`,
  version: '1'
})
export class CreateAircraftController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('create')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 201, description: 'CREATED' })
  public async createAircraft(
    @Body() request: CreateAircraftRequestDto,
    @Res() res: Response
  ): Promise<AircraftDto> {
    const result = await this.commandBus.execute(new CreateAircraft(request));

    res.status(HttpStatus.CREATED).send(result);

    return result;
  }
}

@CommandHandler(CreateAircraft)
export class CreateAircraftHandler implements ICommandHandler<CreateAircraft> {
  constructor(
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher,
    @Inject('IAircraftRepository') private readonly aircraftRepository: IAircraftRepository
  ) {}

  async execute(command: CreateAircraft): Promise<AircraftDto> {
    const existAircraft = await this.aircraftRepository.findAircraftByName(command.name);

    if (existAircraft) {
      throw new ConflictException('Aircraft already taken');
    }

    const aircraftEntity = await this.aircraftRepository.createAircraft(
      new Aircraft({
        name: command.name,
        manufacturingYear: command.manufacturingYear,
        model: command.model
      })
    );

    await this.rabbitmqPublisher.publishMessage(new AircraftCreated(aircraftEntity));

    return mapper.map<Aircraft, AircraftDto>(aircraftEntity, new AircraftDto());
  }
}
