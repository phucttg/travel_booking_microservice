import { SeatHoldSweeperService } from '@/seat/services/seat-hold-sweeper.service';

describe('SeatHoldSweeperService', () => {
  it('releases expired holds and records hold health metrics in one sweep', async () => {
    const seatRepository = {
      releaseExpiredHeldSeats: jest.fn().mockResolvedValue(2),
      countHeldSeats: jest.fn().mockResolvedValue(4),
      countStuckHeldSeats: jest.fn().mockResolvedValue(1)
    };

    const service = new SeatHoldSweeperService(seatRepository as any);

    await (service as any).sweepExpiredHolds();

    expect(seatRepository.releaseExpiredHeldSeats).toHaveBeenCalledTimes(1);
    expect(seatRepository.countHeldSeats).toHaveBeenCalledTimes(1);
    expect(seatRepository.countStuckHeldSeats).toHaveBeenCalledWith(30000);
  });

  it('does not overlap sweeps when one is already running', async () => {
    let resolveRelease: (() => void) | undefined;
    const seatRepository = {
      releaseExpiredHeldSeats: jest.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveRelease = resolve;
          })
      ),
      countHeldSeats: jest.fn(),
      countStuckHeldSeats: jest.fn()
    };

    const service = new SeatHoldSweeperService(seatRepository as any);

    const firstRun = (service as any).sweepExpiredHolds();
    const secondRun = (service as any).sweepExpiredHolds();

    expect(seatRepository.releaseExpiredHeldSeats).toHaveBeenCalledTimes(1);

    resolveRelease?.();
    await firstRun;
    await secondRun;
  });
});
