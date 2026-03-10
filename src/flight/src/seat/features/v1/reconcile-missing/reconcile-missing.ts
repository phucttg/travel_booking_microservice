import { IAircraftRepository } from '@/data/repositories/aircraftRepository';
import { IFlightRepository } from '@/data/repositories/flightRepository';
import { ISeatRepository } from '@/data/repositories/seatRepository';
import { Roles } from '@/common/auth/roles.decorator';
import { RolesGuard } from '@/common/auth/roles.guard';
import {
  ReconcileSeatInventoryItemDto,
  ReconcileSeatInventoryResponseDto,
  SeatInventoryReconcileStatus
} from '@/seat/dtos/reconcile-seat-inventory.dto';
import { ReconcileSeatInventoryQueryDto } from '@/seat/dtos/reconcile-seat-inventory-query.dto';
import { generateSeatTemplatesForModel } from '@/seat/utils/seat-layout';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Inject, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { Role } from 'building-blocks/contracts/identity.contract';

export class ReconcileMissingSeats {
  flightId?: number;

  constructor(request: Partial<ReconcileMissingSeats> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Seats')
@Controller({
  path: `/seat`,
  version: '1'
})
export class ReconcileMissingSeatsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('reconcile-missing')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @ApiResponse({ status: 200, description: 'OK', type: ReconcileSeatInventoryResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  public async reconcileMissingSeats(
    @Query() query: ReconcileSeatInventoryQueryDto
  ): Promise<ReconcileSeatInventoryResponseDto> {
    return await this.commandBus.execute(new ReconcileMissingSeats({ flightId: query.flightId }));
  }
}

@CommandHandler(ReconcileMissingSeats)
export class ReconcileMissingSeatsHandler implements ICommandHandler<ReconcileMissingSeats> {
  constructor(
    @Inject('ISeatRepository') private readonly seatRepository: ISeatRepository,
    @Inject('IFlightRepository') private readonly flightRepository: IFlightRepository,
    @Inject('IAircraftRepository') private readonly aircraftRepository: IAircraftRepository
  ) {}

  async execute(command: ReconcileMissingSeats): Promise<ReconcileSeatInventoryResponseDto> {
    let flights = await this.flightRepository.getAll();

    if (command.flightId) {
      const selectedFlight = flights.find((flight) => flight.id === command.flightId);
      if (!selectedFlight) {
        throw new NotFoundException('Flight not found');
      }

      flights = [selectedFlight];
    }

    const result: ReconcileSeatInventoryItemDto[] = [];
    let fixed = 0;
    let skipped = 0;
    let failed = 0;

    for (const flight of flights) {
      try {
        const aircraft = await this.aircraftRepository.findAircraftById(flight.aircraftId);
        if (!aircraft) {
          failed += 1;
          result.push({
            flightId: flight.id,
            flightNumber: flight.flightNumber,
            aircraftId: flight.aircraftId,
            aircraftModel: 'UNKNOWN',
            expectedCount: 0,
            beforeCount: 0,
            createdCount: 0,
            afterCount: 0,
            missingCount: 0,
            status: SeatInventoryReconcileStatus.FAILED,
            message: 'Aircraft not found'
          });
          continue;
        }

        const seatTemplates = generateSeatTemplatesForModel(aircraft.model);
        const expectedCount = seatTemplates.length;
        const beforeCount = await this.seatRepository.countSeatsByFlightId(flight.id);
        const createdCount = await this.seatRepository.ensureSeatInventory(flight.id, seatTemplates);
        const afterCount = beforeCount + createdCount;
        const missingCount = Math.max(0, expectedCount - afterCount);

        let status = SeatInventoryReconcileStatus.SKIPPED;
        let message = 'Seat inventory already complete';

        if (createdCount > 0) {
          status = SeatInventoryReconcileStatus.FIXED;
          message = 'Missing seats created';
          fixed += 1;
        } else if (missingCount > 0) {
          status = SeatInventoryReconcileStatus.FAILED;
          message = 'Seat inventory is still incomplete after reconcile';
          failed += 1;
        } else {
          skipped += 1;
        }

        result.push({
          flightId: flight.id,
          flightNumber: flight.flightNumber,
          aircraftId: flight.aircraftId,
          aircraftModel: aircraft.model,
          expectedCount,
          beforeCount,
          createdCount,
          afterCount,
          missingCount,
          status,
          message
        });
      } catch (error) {
        failed += 1;
        result.push({
          flightId: flight.id,
          flightNumber: flight.flightNumber,
          aircraftId: flight.aircraftId,
          aircraftModel: 'UNKNOWN',
          expectedCount: 0,
          beforeCount: 0,
          createdCount: 0,
          afterCount: 0,
          missingCount: 0,
          status: SeatInventoryReconcileStatus.FAILED,
          message: error instanceof Error ? error.message : 'Unexpected reconcile error'
        });
      }
    }

    return {
      processed: result.length,
      fixed,
      skipped,
      failed,
      result
    };
  }
}
