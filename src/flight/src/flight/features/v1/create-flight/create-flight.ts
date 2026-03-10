import { FlightDto } from '@/flight/dtos/flight.dto';
import { IFlightRepository } from '@/data/repositories/flightRepository';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FlightStatus } from '@/flight/enums/flight-status.enum';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpStatus,
  Inject,
  NotFoundException,
  Post,
  Res,
  UseGuards
} from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Response } from 'express';
import { Flight } from '@/flight/entities/flight.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { FlightCreated } from 'building-blocks/contracts/flight.contract';
import { Role } from 'building-blocks/contracts/identity.contract';
import { Roles } from '@/common/auth/roles.decorator';
import { RolesGuard } from '@/common/auth/roles.guard';
import mapper from '@/flight/mappings';
import { CreateFlightRequestDto } from '@/flight/dtos/create-flight-request.dto';
import { IAircraftRepository } from '@/data/repositories/aircraftRepository';
import { IAirportRepository } from '@/data/repositories/airportRepository';
import { ISeatRepository } from '@/data/repositories/seatRepository';
import { getEffectiveFlightStatus } from '@/flight/utils/flight-status';
import { deriveFlightDateFromDeparture } from '@/flight/utils/flight-date';
import { generateSeatTemplatesForModel } from '@/seat/utils/seat-layout';
import { DataSource, QueryFailedError } from 'typeorm';

const PG_UNIQUE_VIOLATION = '23505';
const FLIGHT_NUMBER_DATE_UNIQUE_INDEX = 'IDX_flight_flightNumber_flightDate';

type PostgresDriverError = {
  code?: string;
  constraint?: string;
};

export class CreateFlight {
  flightNumber: string;
  price: number;
  flightStatus: FlightStatus;
  flightDate: Date;
  departureDate: Date;
  departureAirportId: number;
  aircraftId: number;
  arriveDate: Date;
  arriveAirportId: number;
  durationMinutes: number;

  constructor(request: Partial<CreateFlight> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Flights')
@Controller({
  path: `/flight`,
  version: '1'
})
export class CreateFlightController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('create')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 201, description: 'CREATED' })
  public async createFlight(
    @Body() request: CreateFlightRequestDto,
    @Res() res: Response
  ): Promise<FlightDto> {
    const result = await this.commandBus.execute(new CreateFlight(request));

    res.status(HttpStatus.CREATED).send(result);

    return result;
  }
}

@CommandHandler(CreateFlight)
export class CreateFlightHandler implements ICommandHandler<CreateFlight> {
  constructor(
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher,
    @Inject('IFlightRepository') private readonly flightRepository: IFlightRepository,
    @Inject('IAircraftRepository') private readonly aircraftRepository: IAircraftRepository,
    @Inject('IAirportRepository') private readonly airportRepository: IAirportRepository,
    @Inject('ISeatRepository') private readonly seatRepository: ISeatRepository,
    private readonly dataSource: DataSource
  ) {}

  async execute(command: CreateFlight): Promise<FlightDto> {
    const canonicalFlightDate = deriveFlightDateFromDeparture(command.departureDate);

    if (command.flightStatus === FlightStatus.UNKNOWN) {
      throw new BadRequestException(
        `Invalid flightStatus: ${command.flightStatus}. Please choose a valid status other than UNKNOWN.`
      );
    }

    if (command.arriveDate <= command.departureDate) {
      throw new BadRequestException(
        `Invalid schedule: arriveDate (${command.arriveDate.toISOString()}) must be after departureDate (${command.departureDate.toISOString()}).`
      );
    }

    if (command.departureAirportId === command.arriveAirportId) {
      throw new BadRequestException(
        `Invalid routing: arriveAirportId (${command.arriveAirportId}) must be different from departureAirportId (${command.departureAirportId}).`
      );
    }

    const computedDurationMinutes = Math.round(
      (command.arriveDate.getTime() - command.departureDate.getTime()) / 60000
    );

    if (computedDurationMinutes !== command.durationMinutes) {
      throw new BadRequestException(
        `durationMinutes must match departureDate and arriveDate (expected ${computedDurationMinutes}, received ${command.durationMinutes}).`
      );
    }

    const [aircraft, departureAirport, arriveAirport] = await Promise.all([
      this.aircraftRepository.findAircraftById(command.aircraftId),
      this.airportRepository.findAirportById(command.departureAirportId),
      this.airportRepository.findAirportById(command.arriveAirportId)
    ]);

    if (!aircraft) {
      throw new NotFoundException('Aircraft not found');
    }

    if (!departureAirport) {
      throw new NotFoundException('Departure airport not found');
    }

    if (!arriveAirport) {
      throw new NotFoundException('Arrival airport not found');
    }

    const seatTemplates = generateSeatTemplatesForModel(aircraft.model);
    let flightEntity: Flight;

    try {
      flightEntity = await this.dataSource.transaction(async (manager) => {
        const existingFlight = await this.flightRepository.findFlightByNumberAndDate(
          command.flightNumber,
          canonicalFlightDate,
          manager
        );

        if (existingFlight) {
          throw new ConflictException('Flight already exists for the selected flightDate');
        }

        const createdFlight = await this.flightRepository.createFlight(
          new Flight({
            flightNumber: command.flightNumber,
            aircraftId: command.aircraftId,
            arriveAirportId: command.arriveAirportId,
            arriveDate: command.arriveDate,
            price: command.price,
            departureAirportId: command.departureAirportId,
            departureDate: command.departureDate,
            flightDate: canonicalFlightDate,
            flightStatus: command.flightStatus,
            durationMinutes: command.durationMinutes
          }),
          manager
        );

        await this.seatRepository.ensureSeatInventory(createdFlight.id, seatTemplates, manager);

        return createdFlight;
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if (this.isFlightNumberDateConflict(error)) {
        throw new ConflictException('Flight already exists for the selected flightDate');
      }

      throw error;
    }

    await this.rabbitmqPublisher.publishMessage(new FlightCreated(flightEntity));

    const result = mapper.map<Flight, FlightDto>(flightEntity, new FlightDto());
    result.flightStatus = getEffectiveFlightStatus(flightEntity);

    return result;
  }

  private isFlightNumberDateConflict(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as PostgresDriverError | undefined;
    return (
      driverError?.code === PG_UNIQUE_VIOLATION &&
      driverError?.constraint === FLIGHT_NUMBER_DATE_UNIQUE_INDEX
    );
  }
}
