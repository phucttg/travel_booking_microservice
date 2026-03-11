import { describe, expect, it } from 'vitest';
import { BookingStatus, FlightStatus } from '@/types/enums';
import { canCancelBooking, isFlightBookable } from '@utils/presentation';

const futureDeparture = '2099-03-10T10:00:00.000Z';
const pastDeparture = '2000-03-10T10:00:00.000Z';

describe('presentation booking rules', () => {
  it('allows booking only for future scheduled or delayed flights', () => {
    expect(isFlightBookable({ flightStatus: FlightStatus.SCHEDULED, departureDate: futureDeparture })).toBe(true);
    expect(isFlightBookable({ flightStatus: FlightStatus.DELAY, departureDate: futureDeparture })).toBe(true);

    expect(isFlightBookable({ flightStatus: FlightStatus.CANCELED, departureDate: futureDeparture })).toBe(false);
    expect(isFlightBookable({ flightStatus: FlightStatus.FLYING, departureDate: futureDeparture })).toBe(false);
    expect(isFlightBookable({ flightStatus: FlightStatus.COMPLETED, departureDate: futureDeparture })).toBe(false);
    expect(isFlightBookable({ flightStatus: FlightStatus.SCHEDULED, departureDate: pastDeparture })).toBe(false);
    expect(isFlightBookable({ flightStatus: FlightStatus.SCHEDULED, departureDate: 'not-a-date' })).toBe(false);
  });

  it('prevents cancellation for non-confirmed bookings or active/completed flights', () => {
    expect(
      canCancelBooking(
        { bookingStatus: BookingStatus.CONFIRMED },
        { flightStatus: FlightStatus.SCHEDULED }
      )
    ).toBe(true);

    expect(
      canCancelBooking(
        { bookingStatus: BookingStatus.CONFIRMED },
        { flightStatus: FlightStatus.FLYING }
      )
    ).toBe(false);

    expect(
      canCancelBooking(
        { bookingStatus: BookingStatus.CONFIRMED },
        { flightStatus: FlightStatus.COMPLETED }
      )
    ).toBe(false);

    expect(
      canCancelBooking(
        { bookingStatus: BookingStatus.CANCELED },
        { flightStatus: FlightStatus.SCHEDULED }
      )
    ).toBe(false);
  });
});
