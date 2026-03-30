import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import axios from 'axios';
import { Booking } from '@/booking/entities/booking.entity';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { BookingSeatWorkflowService } from '@/booking/services/booking-seat-workflow.service';
import { IFlightClient } from '@/booking/http-client/services/flight/flight.client';
import { SeatState } from 'building-blocks/contracts/flight.contract';

@Injectable()
export class BookingSeatCommitReconcilerService implements OnModuleInit, OnModuleDestroy {
  private intervalRef?: NodeJS.Timeout;
  private isRunning = false;
  private readonly sweepMs = Number(process.env.BOOKING_SEAT_SWEEP_MS || 30000);

  constructor(
    private readonly dataSource: DataSource,
    @Inject('IFlightClient') private readonly flightClient: IFlightClient,
    private readonly bookingSeatWorkflowService: BookingSeatWorkflowService
  ) {}

  onModuleInit(): void {
    this.intervalRef = setInterval(() => {
      void this.reconcilePendingSeatCommits();
    }, this.sweepMs);

    void this.reconcilePendingSeatCommits();
  }

  onModuleDestroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  private async reconcilePendingSeatCommits(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const bookingIds = await this.dataSource
        .getRepository(Booking)
        .createQueryBuilder('booking')
        .select('booking.id', 'id')
        .where('booking.bookingStatus = :confirmedStatus', {
          confirmedStatus: BookingStatus.CONFIRMED
        })
        .andWhere('booking.seatHoldToken IS NOT NULL')
        .andWhere('booking.seatCommittedAt IS NULL')
        .orderBy('booking.seatCommitRequestedAt', 'ASC', 'NULLS FIRST')
        .addOrderBy('booking.confirmedAt', 'ASC')
        .limit(50)
        .getRawMany<{ id: string }>();

      for (const bookingId of bookingIds) {
        await this.reconcileBookingSeatCommit(Number(bookingId.id));
      }
    } catch (error) {
      Logger.error('Booking seat commit reconciler failed', error as Error);
    } finally {
      this.isRunning = false;
    }
  }

  private async reconcileBookingSeatCommit(bookingId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .getRepository(Booking)
        .createQueryBuilder('booking')
        .setLock('pessimistic_write')
        .where('booking.id = :id', { id: bookingId })
        .getOne();

      if (
        !booking ||
        booking.bookingStatus !== BookingStatus.CONFIRMED ||
        !booking.seatHoldToken ||
        booking.seatCommittedAt
      ) {
        return;
      }

      let seatState;
      try {
        seatState = await this.flightClient.getSeatState(booking.flightId, booking.seatNumber);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          Logger.warn(`Seat state missing for booking ${booking.id}. Reconciler will retry.`);
          return;
        }

        throw error;
      }

      const occurredAt = new Date();

      if (seatState.seatState === SeatState.BOOKED && seatState.reservedBookingId === booking.id) {
        await manager.getRepository(Booking).save(
          new Booking({
            ...booking,
            seatCommittedAt: occurredAt,
            updatedAt: occurredAt
          })
        );
        return;
      }

      const holdExpiresAt = seatState.holdExpiresAt ? new Date(seatState.holdExpiresAt) : null;
      const isActiveMatchingHold =
        seatState.seatState === SeatState.HELD && holdExpiresAt && holdExpiresAt.getTime() > occurredAt.getTime();

      if (isActiveMatchingHold) {
        const refreshedBooking = await manager.getRepository(Booking).save(
          new Booking({
            ...booking,
            seatCommitRequestedAt: occurredAt,
            updatedAt: occurredAt
          })
        );

        await this.bookingSeatWorkflowService.enqueueSeatCommit(manager, refreshedBooking, occurredAt);
        return;
      }

      const canceledBooking = await this.bookingSeatWorkflowService.cancelBooking(manager, booking, occurredAt);
      await this.bookingSeatWorkflowService.enqueueRefund(
        manager,
        canceledBooking,
        'Seat commit failed after payment succeeded',
        occurredAt
      );
    });
  }
}
