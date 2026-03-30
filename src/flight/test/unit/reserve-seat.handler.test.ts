import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReserveSeat, ReserveSeatHandler } from '@/seat/features/v1/reserve-seat/reserve-seat';
import { FlightStatus } from '@/flight/enums/flight-status.enum';
import { SeatClass } from '@/seat/enums/seat-class.enum';
import {
  PREMIUM_SEAT_SELECTION_REQUIRED_CODE,
  PREMIUM_SEAT_SELECTION_REQUIRED_MESSAGE
} from 'building-blocks/contracts/flight.contract';

const buildBookableFlight = () => ({
  id: 7,
  price: 1500000,
  flightStatus: FlightStatus.SCHEDULED,
  departureDate: '2099-03-10T08:00:00.000Z',
  arriveDate: '2099-03-10T10:00:00.000Z'
});

describe('ReserveSeatHandler', () => {
  it('auto-assigns an economy seat when seatNumber is omitted', async () => {
    const rabbitmqPublisher = {
      publishMessage: jest.fn()
    };
    const flightRepository = {
      findFlightById: jest.fn().mockResolvedValue(buildBookableFlight())
    };
    const seatRepository = {
      reserveSeat: jest.fn(),
      reserveEconomySeat: jest.fn().mockResolvedValue({
        id: 10,
        seatNumber: '3A',
        seatClass: SeatClass.ECONOMY,
        seatType: 1,
        flightId: 7,
        isReserved: true,
        createdAt: new Date()
      }),
      hasAvailablePremiumSeats: jest.fn()
    };

    const handler = new ReserveSeatHandler(
      rabbitmqPublisher as any,
      flightRepository as any,
      seatRepository as any
    );

    const result = await handler.execute(
      new ReserveSeat({
        flightId: 7
      })
    );

    expect(seatRepository.reserveEconomySeat).toHaveBeenCalledWith(7, undefined);
    expect(seatRepository.reserveSeat).not.toHaveBeenCalled();
    expect(result.seatNumber).toBe('3A');
    expect(result.seatClass).toBe(SeatClass.ECONOMY);
    expect(result.price).toBe(1500000);
    expect(rabbitmqPublisher.publishMessage).toHaveBeenCalledTimes(1);
  });

  it('returns a premium-selection conflict when only premium seats remain', async () => {
    const rabbitmqPublisher = {
      publishMessage: jest.fn()
    };
    const flightRepository = {
      findFlightById: jest.fn().mockResolvedValue(buildBookableFlight())
    };
    const seatRepository = {
      reserveSeat: jest.fn(),
      reserveEconomySeat: jest.fn().mockResolvedValue(null),
      hasAvailablePremiumSeats: jest.fn().mockResolvedValue(true)
    };

    const handler = new ReserveSeatHandler(
      rabbitmqPublisher as any,
      flightRepository as any,
      seatRepository as any
    );

    try {
      await handler.execute(
        new ReserveSeat({
          flightId: 7
        })
      );
      fail('Expected premium-selection conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual({
        message: PREMIUM_SEAT_SELECTION_REQUIRED_MESSAGE,
        code: PREMIUM_SEAT_SELECTION_REQUIRED_CODE
      });
    }

    expect(rabbitmqPublisher.publishMessage).not.toHaveBeenCalled();
  });

  it('returns not found when the cabin is fully sold out', async () => {
    const rabbitmqPublisher = {
      publishMessage: jest.fn()
    };
    const flightRepository = {
      findFlightById: jest.fn().mockResolvedValue(buildBookableFlight())
    };
    const seatRepository = {
      reserveSeat: jest.fn(),
      reserveEconomySeat: jest.fn().mockResolvedValue(null),
      hasAvailablePremiumSeats: jest.fn().mockResolvedValue(false)
    };

    const handler = new ReserveSeatHandler(
      rabbitmqPublisher as any,
      flightRepository as any,
      seatRepository as any
    );

    await expect(
      handler.execute(
        new ReserveSeat({
          flightId: 7
        })
      )
    ).rejects.toThrow(new NotFoundException('No seat available!'));

    expect(rabbitmqPublisher.publishMessage).not.toHaveBeenCalled();
  });

  it('preserves explicit premium seat reservations and pricing', async () => {
    const rabbitmqPublisher = {
      publishMessage: jest.fn()
    };
    const flightRepository = {
      findFlightById: jest.fn().mockResolvedValue(buildBookableFlight())
    };
    const seatRepository = {
      reserveSeat: jest.fn().mockResolvedValue({
        id: 11,
        seatNumber: '1A',
        seatClass: SeatClass.BUSINESS,
        seatType: 1,
        flightId: 7,
        isReserved: true,
        createdAt: new Date()
      }),
      reserveEconomySeat: jest.fn(),
      hasAvailablePremiumSeats: jest.fn()
    };

    const handler = new ReserveSeatHandler(
      rabbitmqPublisher as any,
      flightRepository as any,
      seatRepository as any
    );

    const result = await handler.execute(
      new ReserveSeat({
        flightId: 7,
        seatNumber: '1A'
      })
    );

    expect(seatRepository.reserveSeat).toHaveBeenCalledWith(7, '1A', undefined);
    expect(seatRepository.reserveEconomySeat).not.toHaveBeenCalled();
    expect(result.seatClass).toBe(SeatClass.BUSINESS);
    expect(result.price).toBe(2625000);
    expect(rabbitmqPublisher.publishMessage).toHaveBeenCalledTimes(1);
  });
});
