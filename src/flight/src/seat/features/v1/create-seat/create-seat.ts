import { ISeatRepository } from '@/data/repositories/seatRepository';
import { IFlightRepository } from '@/data/repositories/flightRepository';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
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
import { SeatDto } from '@/seat/dtos/seat.dto';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Response } from 'express';
import { Seat } from '@/seat/entities/seat.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { SeatCreated } from 'building-blocks/contracts/flight.contract';
import { Role } from 'building-blocks/contracts/identity.contract';
import { Roles } from '@/common/auth/roles.decorator';
import { RolesGuard } from '@/common/auth/roles.guard';
import mapper from '@/seat/mappings';
import { CreateSeatRequestDto } from '@/seat/dtos/create-seat-request.dto';
import { SeatClass } from '@/seat/enums/seat-class.enum';
import { SeatType } from '@/seat/enums/seat-type.enum';

export class CreateSeat {
  seatNumber: string;
  seatClass: SeatClass;
  seatType: SeatType;
  flightId: number;

  constructor(request: Partial<CreateSeat> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Seats')
@Controller({
  path: `/seat`,
  version: '1'
})
export class CreateSeatController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('create')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 201, description: 'CREATED' })
  public async createSeat(
    @Body() request: CreateSeatRequestDto,
    @Res() res: Response
  ): Promise<SeatDto> {
    const result = await this.commandBus.execute(new CreateSeat(request));

    res.status(HttpStatus.CREATED).send(result);
    return result;
  }
}

@CommandHandler(CreateSeat)
export class CreateSeatHandler implements ICommandHandler<CreateSeat> {
  constructor(
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher,
    @Inject('ISeatRepository') private readonly seatRepository: ISeatRepository,
    @Inject('IFlightRepository') private readonly flightRepository: IFlightRepository
  ) {}

  async execute(command: CreateSeat): Promise<SeatDto> {
    const [existFlight, existingSeat] = await Promise.all([
      this.flightRepository.findFlightById(command.flightId),
      this.seatRepository.findSeatByFlightIdAndSeatNumber(command.flightId, command.seatNumber)
    ]);

    if (existFlight == null) {
      throw new NotFoundException('Flight not found!');
    }

    if (existingSeat) {
      throw new ConflictException('Seat already exists for this flight');
    }

    const seatEntity = await this.seatRepository.createSeat(
      new Seat({
        flightId: command.flightId,
        seatNumber: command.seatNumber,
        seatClass: command.seatClass,
        seatType: command.seatType,
        isReserved: false
      })
    );

    await this.rabbitmqPublisher.publishMessage(new SeatCreated(seatEntity));

    return mapper.map<Seat, SeatDto>(seatEntity, new SeatDto());
  }
}
