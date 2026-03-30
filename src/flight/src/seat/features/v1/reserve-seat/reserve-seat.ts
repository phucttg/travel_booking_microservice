import { ISeatRepository } from '@/data/repositories/seatRepository';
import { IFlightRepository } from '@/data/repositories/flightRepository';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { Response } from 'express';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Seat } from '@/seat/entities/seat.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import {
  PREMIUM_SEAT_SELECTION_REQUIRED_CODE,
  PREMIUM_SEAT_SELECTION_REQUIRED_MESSAGE,
  SeatReserved
} from 'building-blocks/contracts/flight.contract';
import { ReserveSeatRequestDto } from '@/seat/dtos/reserve-seat-request.dto';
import mapper from '@/seat/mappings';
import { SeatReservationDto } from '@/seat/dtos/seat-reservation.dto';
import { isFlightBookable } from '@/flight/utils/flight-status';
import { calculateSeatPrice } from '@/seat/utils/seat-pricing';
import { SeatState } from '@/seat/enums/seat-state.enum';

export class ReserveSeat {
  seatNumber?: string;
  flightId: number;
  holdUntil?: Date;

  constructor(request: Partial<ReserveSeat> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Seats')
@Controller({
  path: `/seat`,
  version: '1'
})
export class ReserveSeatController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('reserve')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 409, description: PREMIUM_SEAT_SELECTION_REQUIRED_CODE })
  public async reserveSeat(
    @Body() request: ReserveSeatRequestDto,
    @Res() res: Response
  ): Promise<SeatReservationDto> {
    const result = await this.commandBus.execute(new ReserveSeat(request));

    res.status(HttpStatus.OK).send(result);
    return result;
  }
}

@CommandHandler(ReserveSeat)
export class ReserveSeatHandler implements ICommandHandler<ReserveSeat> {
  constructor(
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher,
    @Inject('IFlightRepository') private readonly flightRepository: IFlightRepository,
    @Inject('ISeatRepository') private readonly seatRepository: ISeatRepository
  ) {}

  async execute(command: ReserveSeat): Promise<SeatReservationDto> {
    const existFlight = await this.flightRepository.findFlightById(command.flightId);

    if (existFlight == null) {
      throw new NotFoundException('Flight not found!');
    }

    if (!isFlightBookable(existFlight)) {
      throw new NotFoundException('Flight is no longer available for booking');
    }

    if (command.holdUntil && new Date(command.holdUntil) <= new Date()) {
      throw new BadRequestException('holdUntil must be in the future');
    }

    const seat = command.seatNumber
      ? await this.seatRepository.reserveSeat(command.flightId, command.seatNumber, command.holdUntil)
      : await this.seatRepository.reserveEconomySeat(command.flightId, command.holdUntil);

    if (seat == null) {
      if (!command.seatNumber && (await this.seatRepository.hasAvailablePremiumSeats(command.flightId))) {
        throw new ConflictException({
          message: PREMIUM_SEAT_SELECTION_REQUIRED_MESSAGE,
          code: PREMIUM_SEAT_SELECTION_REQUIRED_CODE
        });
      }

      throw new NotFoundException(command.seatNumber ? 'Seat not available!' : 'No seat available!');
    }

    const seatDto = mapper.map<Seat, SeatReservationDto>(seat, new SeatReservationDto());
    seatDto.price = calculateSeatPrice(existFlight.price, seat.seatClass);
    seatDto.currency = 'VND';
    seatDto.holdToken = seat.seatState === SeatState.HELD ? seat.holdToken : null;
    seatDto.holdExpiresAt = seat.seatState === SeatState.HELD ? seat.holdExpiresAt : null;

    await this.rabbitmqPublisher.publishMessage(new SeatReserved(seatDto));

    return seatDto;
  }
}
