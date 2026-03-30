import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Booking } from '@/booking/entities/booking.entity';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { SeatReleaseReason } from 'building-blocks/contracts/flight.contract';
import { BookingSeatWorkflowService } from '@/booking/services/booking-seat-workflow.service';

@Injectable()
export class BookingPendingSeatSweeperService implements OnModuleInit, OnModuleDestroy {
  private intervalRef?: NodeJS.Timeout;
  private isRunning = false;
  private readonly sweepMs = Number(process.env.BOOKING_SEAT_SWEEP_MS || 30000);

  constructor(
    private readonly dataSource: DataSource,
    private readonly bookingSeatWorkflowService: BookingSeatWorkflowService
  ) {}

  onModuleInit(): void {
    this.intervalRef = setInterval(() => {
      void this.expirePendingSeatHolds();
    }, this.sweepMs);

    void this.expirePendingSeatHolds();
  }

  onModuleDestroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  private async expirePendingSeatHolds(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const now = new Date();
      const expiredCount = await this.dataSource.transaction(async (manager) => {
        const expiredBookings = await manager
          .getRepository(Booking)
          .createQueryBuilder('booking')
          .setLock('pessimistic_write')
          .where('booking.bookingStatus = :pendingStatus', {
            pendingStatus: BookingStatus.PENDING_PAYMENT
          })
          .andWhere('booking.seatHoldToken IS NOT NULL')
          .andWhere('booking.seatHoldExpiresAt IS NOT NULL')
          .andWhere('booking.seatHoldExpiresAt <= :now', { now })
          .orderBy('booking.seatHoldExpiresAt', 'ASC')
          .limit(50)
          .getMany();

        for (const expiredBooking of expiredBookings) {
          await this.bookingSeatWorkflowService.expirePendingBooking(
            manager,
            expiredBooking,
            SeatReleaseReason.BOOKING_EXPIRED,
            now
          );
        }

        return expiredBookings.length;
      });

      if (expiredCount > 0) {
        Logger.log(
          JSON.stringify({
            component: BookingPendingSeatSweeperService.name,
            expiredCount
          })
        );
      }
    } catch (error) {
      Logger.error('Booking pending seat sweeper failed', error as Error);
    } finally {
      this.isRunning = false;
    }
  }
}
