import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ISeatRepository } from '@/data/repositories/seatRepository';

@Injectable()
export class SeatHoldSweeperService implements OnModuleInit, OnModuleDestroy {
  private intervalRef?: NodeJS.Timeout;
  private isRunning = false;
  private readonly sweepMs = Number(process.env.SEAT_HOLD_SWEEP_MS || 30000);

  constructor(@Inject('ISeatRepository') private readonly seatRepository: ISeatRepository) {}

  onModuleInit(): void {
    this.intervalRef = setInterval(() => {
      void this.sweepExpiredHolds();
    }, this.sweepMs);

    void this.sweepExpiredHolds();
  }

  onModuleDestroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  private async sweepExpiredHolds(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const releasedCount = await this.seatRepository.releaseExpiredHeldSeats();
      const heldCount = await this.seatRepository.countHeldSeats();
      const stuckCount = await this.seatRepository.countStuckHeldSeats(this.sweepMs);

      if (releasedCount > 0 || stuckCount > 0) {
        Logger.log(
          JSON.stringify({
            component: SeatHoldSweeperService.name,
            releasedCount,
            heldCount,
            stuckCount
          })
        );
      }
    } catch (error) {
      Logger.error('Seat hold sweeper failed', error as Error);
    } finally {
      this.isRunning = false;
    }
  }
}
