import { AirportDto } from '@/airport/dtos/airport.dto';
import { IAirportRepository } from '@/data/repositories/airportRepository';
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
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Response } from 'express';
import { Airport } from '@/airport/entities/airport.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { AirportCreated } from 'building-blocks/contracts/flight.contract';
import { Role } from 'building-blocks/contracts/identity.contract';
import { Roles } from '@/common/auth/roles.decorator';
import { RolesGuard } from '@/common/auth/roles.guard';
import mapper from '@/airport/mappings';
import { CreateAirportRequestDto } from '@/airport/dtos/create-airport-request.dto';

export class CreateAirport {
  code: string;
  name: string;
  address: string;

  constructor(request: Partial<CreateAirport> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Airports')
@Controller({
  path: `/airport`,
  version: '1'
})
export class CreateAirportController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('create')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 201, description: 'CREATED' })
  public async createAirport(
    @Body() request: CreateAirportRequestDto,
    @Res() res: Response
  ): Promise<AirportDto> {
    const result = await this.commandBus.execute(new CreateAirport(request));

    res.status(HttpStatus.CREATED).send(result);

    return result;
  }
}

@CommandHandler(CreateAirport)
export class CreateAirportHandler implements ICommandHandler<CreateAirport> {
  constructor(
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher,
    @Inject('IAirportRepository') private readonly airportRepository: IAirportRepository
  ) {}

  async execute(command: CreateAirport): Promise<AirportDto> {
    const existAirport = await this.airportRepository.findAirportByName(command.name);

    if (existAirport) {
      throw new ConflictException('Airport already taken');
    }

    const airportEntity = await this.airportRepository.createAirport(
      new Airport({
        code: command.code,
        address: command.address,
        name: command.name
      })
    );

    await this.rabbitmqPublisher.publishMessage(new AirportCreated(airportEntity));

    return mapper.map<Airport, AirportDto>(airportEntity, new AirportDto());
  }
}
