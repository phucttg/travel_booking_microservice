import { FlightStatus } from '@/flight/enums/flight-status.enum';

type FlightTimingLike = {
  flightStatus: FlightStatus;
  departureDate: Date | string;
  arriveDate: Date | string;
};

const toDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

export const getEffectiveFlightStatus = (flight: FlightTimingLike, now: Date = new Date()): FlightStatus => {
  const departureDate = toDate(flight.departureDate);
  const arriveDate = toDate(flight.arriveDate);

  if (flight.flightStatus === FlightStatus.CANCELED) {
    return FlightStatus.CANCELED;
  }

  if (now >= arriveDate) {
    return FlightStatus.COMPLETED;
  }

  if (now >= departureDate && now < arriveDate) {
    return FlightStatus.FLYING;
  }

  if (flight.flightStatus === FlightStatus.DELAY && now < departureDate) {
    return FlightStatus.DELAY;
  }

  return FlightStatus.SCHEDULED;
};

export const isFlightBookable = (flight: FlightTimingLike, now: Date = new Date()): boolean => {
  const effectiveStatus = getEffectiveFlightStatus(flight, now);
  const departureDate = toDate(flight.departureDate);

  return [FlightStatus.SCHEDULED, FlightStatus.DELAY].includes(effectiveStatus) && departureDate > now;
};
