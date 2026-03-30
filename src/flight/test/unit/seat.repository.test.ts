import { SeatRepository } from '@/data/repositories/seatRepository';
import { SeatClass } from '@/seat/enums/seat-class.enum';
import { SeatState } from '@/seat/enums/seat-state.enum';

describe('SeatRepository.reserveEconomySeat', () => {
  it('locks the lowest-numbered available economy seat', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: '21',
        seatNumber: '3A',
        seatClass: String(SeatClass.ECONOMY),
        seatType: '1',
        flightId: '7',
        isReserved: true,
        createdAt: '2099-03-10T07:00:00.000Z',
        updatedAt: '2099-03-10T07:05:00.000Z'
      }
    ]);
    const transaction = jest.fn().mockImplementation(async (callback) => callback({ query }));
    const typeormRepository = {
      manager: {
        transaction
      },
      create: jest.fn().mockImplementation((value) => value)
    };

    const repository = new SeatRepository(typeormRepository as any);
    const seat = await repository.reserveEconomySeat(7);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('AND "seatClass" = $2'), [
      7,
      String(SeatClass.ECONOMY),
      SeatState.AVAILABLE,
      SeatState.HELD,
      SeatState.BOOKED,
      true
    ]);
    expect(query.mock.calls[0][0]).toContain('AND ("seatState" = $3 OR ("seatState" = $4 AND "holdExpiresAt" <= CURRENT_TIMESTAMP))');
    expect(query.mock.calls[0][0]).toContain('ORDER BY "seatNumber" ASC');
    expect(seat).toMatchObject({
      id: 21,
      flightId: 7,
      seatNumber: '3A',
      seatClass: SeatClass.ECONOMY
    });
  });
});

describe('SeatRepository.hasAvailablePremiumSeats', () => {
  it('only counts business and first-class seats when checking premium availability', async () => {
    const andWhere = jest.fn().mockReturnThis();
    const where = jest.fn().mockReturnThis();
    const getCount = jest.fn().mockResolvedValue(2);
    const createQueryBuilder = jest.fn().mockReturnValue({
      where,
      andWhere,
      getCount
    });
    const typeormRepository = {
      createQueryBuilder
    };

    const repository = new SeatRepository(typeormRepository as any);
    const hasPremiumSeats = await repository.hasAvailablePremiumSeats(7);

    expect(createQueryBuilder).toHaveBeenCalledWith('seat');
    expect(where).toHaveBeenCalledWith('seat.flightId = :flightId', { flightId: 7 });
    expect(andWhere).toHaveBeenNthCalledWith(
      1,
      '(seat.seatState = :availableState OR (seat.seatState = :heldState AND seat.holdExpiresAt <= CURRENT_TIMESTAMP))',
      {
        availableState: SeatState.AVAILABLE,
        heldState: SeatState.HELD
      }
    );
    expect(andWhere).toHaveBeenNthCalledWith(2, 'seat.seatClass IN (:...premiumSeatClasses)', {
      premiumSeatClasses: [String(SeatClass.FIRST_CLASS), String(SeatClass.BUSINESS)]
    });
    expect(hasPremiumSeats).toBe(true);
  });
});
