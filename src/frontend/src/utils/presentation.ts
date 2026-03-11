import dayjs from 'dayjs';
import { AirportDto } from '@/types/airport.types';
import { BookingDto } from '@/types/booking.types';
import { FlightDto } from '@/types/flight.types';
import { BookingStatus, FlightStatus, PassengerType, Role, SeatClass, SeatType } from '@/types/enums';
import { SeatDto } from '@/types/seat.types';

type AirportLike = Pick<AirportDto, 'code' | 'name'> | undefined;

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

export const getAirportIdentity = (airport?: AirportLike, fallbackId?: number) => ({
  code: airport?.code || (fallbackId ? `#${fallbackId}` : '---'),
  name: airport?.name || 'Unknown airport'
});

export const buildRouteDescriptor = (
  departureAirport?: AirportLike,
  arriveAirport?: AirportLike,
  departureId?: number,
  arriveId?: number
) => {
  const departure = getAirportIdentity(departureAirport, departureId);
  const arrival = getAirportIdentity(arriveAirport, arriveId);

  return {
    departure,
    arrival,
    compact: `${departure.code} -> ${arrival.code}`,
    verbose: `${departure.name} to ${arrival.name}`
  };
};

export const formatTimeLabel = (value?: string | Date | null, format = 'HH:mm') => {
  if (!value) return '--:--';
  return dayjs(value).format(format);
};

export const formatDateLabel = (value?: string | Date | null, format = 'DD MMM YYYY') => {
  if (!value) return '--';
  return dayjs(value).format(format);
};

export const formatScheduleStrip = (departure?: string | Date | null, arrive?: string | Date | null) =>
  `${formatTimeLabel(departure)} - ${formatTimeLabel(arrive)}`;

export const getAirlineName = (flightNumber?: string | null): string => {
  if (!flightNumber) return 'Unknown airline';
  const prefix = flightNumber.replace(/[0-9]/g, '').toUpperCase();
  const airlines: Record<string, string> = {
    VN: 'Vietnam Airlines',
    VJ: 'VietJet Air',
    BL: 'Pacific Airlines',
    QH: 'Bamboo Airways'
  };

  return airlines[prefix] || prefix || 'Unknown airline';
};

export const getAirlineColor = (flightNumber?: string | null): string => {
  if (!flightNumber) return '#0f6cbd';
  const prefix = flightNumber.replace(/[0-9]/g, '').toUpperCase();
  const colors: Record<string, string> = {
    VN: '#00338d',
    VJ: '#ed1c24',
    BL: '#f7941d',
    QH: '#00a651'
  };

  return colors[prefix] || '#0f6cbd';
};

export const formatQuerySyncLabel = (timestamp?: number | null) =>
  timestamp && timestamp > 0 ? `Last sync ${dayjs(timestamp).format('HH:mm:ss')}` : 'Awaiting sync';

export const getLatestQueryTimestamp = (...timestamps: Array<number | undefined>) => {
  const valid = timestamps.filter((value): value is number => Boolean(value && value > 0));
  if (!valid.length) return null;
  return Math.max(...valid);
};

export const getFlightStatusTone = (status: FlightStatus): StatusTone => {
  switch (status) {
    case FlightStatus.SCHEDULED:
      return 'accent';
    case FlightStatus.FLYING:
      return 'info';
    case FlightStatus.COMPLETED:
      return 'success';
    case FlightStatus.DELAY:
      return 'warning';
    case FlightStatus.CANCELED:
      return 'danger';
    default:
      return 'neutral';
  }
};

export const getBookingStatusTone = (status: BookingStatus): StatusTone => {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return 'success';
    case BookingStatus.CANCELED:
      return 'danger';
    default:
      return 'neutral';
  }
};

export const getPassengerTone = (type: PassengerType): StatusTone => {
  switch (type) {
    case PassengerType.MALE:
      return 'info';
    case PassengerType.FEMALE:
      return 'accent';
    case PassengerType.BABY:
      return 'warning';
    default:
      return 'neutral';
  }
};

export const isFlightBookable = (flight?: Pick<FlightDto, 'flightStatus' | 'departureDate'> | null): boolean => {
  if (!flight) return false;

  const departureDate = new Date(flight.departureDate);

  if (Number.isNaN(departureDate.valueOf())) {
    return false;
  }

  return [FlightStatus.SCHEDULED, FlightStatus.DELAY].includes(flight.flightStatus) && departureDate > new Date();
};

export const canCancelBooking = (
  booking?: Pick<BookingDto, 'bookingStatus'> | null,
  flight?: Pick<FlightDto, 'flightStatus'> | null
): boolean => {
  if (!booking || booking.bookingStatus !== BookingStatus.CONFIRMED) {
    return false;
  }

  if (!flight) {
    return true;
  }

  return ![FlightStatus.COMPLETED, FlightStatus.FLYING].includes(flight.flightStatus);
};

export const getRoleTone = (role: Role): StatusTone => {
  if (role === Role.ADMIN) return 'accent';
  return 'info';
};

export const getSeatClassTone = (seatClass: SeatClass): StatusTone => {
  switch (seatClass) {
    case SeatClass.FIRST_CLASS:
      return 'accent';
    case SeatClass.BUSINESS:
      return 'info';
    case SeatClass.ECONOMY:
      return 'success';
    default:
      return 'neutral';
  }
};

export const getSeatTypeTone = (seatType: SeatType): StatusTone => {
  switch (seatType) {
    case SeatType.WINDOW:
      return 'info';
    case SeatType.AISLE:
      return 'accent';
    case SeatType.MIDDLE:
      return 'warning';
    default:
      return 'neutral';
  }
};

export const summarizeSeats = (seats: SeatDto[]) => {
  const byClass = seats.reduce<Record<string, number>>((acc, seat) => {
    acc[String(seat.seatClass)] = (acc[String(seat.seatClass)] || 0) + 1;
    return acc;
  }, {});

  const byType = seats.reduce<Record<string, number>>((acc, seat) => {
    acc[String(seat.seatType)] = (acc[String(seat.seatType)] || 0) + 1;
    return acc;
  }, {});

  return {
    total: seats.length,
    byClass,
    byType
  };
};

type ParsedSeat = {
  seat: SeatDto;
  rowKey: string;
  columnKey: string;
};

const parseSeatNumber = (seatNumber: string): { rowKey: string; columnKey: string } | null => {
  const upper = seatNumber.trim().toUpperCase();
  const numericFirst = upper.match(/^(\d+)([A-Z]+)$/);
  if (numericFirst) {
    return { rowKey: numericFirst[1], columnKey: numericFirst[2] };
  }

  const alphaFirst = upper.match(/^([A-Z]+)(\d+)$/);
  if (alphaFirst) {
    return { rowKey: alphaFirst[2], columnKey: alphaFirst[1] };
  }

  return null;
};

export const buildSeatGrid = (seats: SeatDto[]) => {
  const parsedSeats: ParsedSeat[] = [];

  for (const seat of seats) {
    const parsed = parseSeatNumber(seat.seatNumber);
    if (!parsed) {
      return { isGrid: false as const, rows: [] as never[] };
    }

    parsedSeats.push({ seat, ...parsed });
  }

  const rowKeys = [...new Set(parsedSeats.map((item) => item.rowKey))].sort((a, b) => Number(a) - Number(b));
  const columnKeys = [...new Set(parsedSeats.map((item) => item.columnKey))].sort();

  const rows = rowKeys.map((rowKey) => ({
    rowKey,
    seats: columnKeys.map((columnKey) => {
      const match = parsedSeats.find((item) => item.rowKey === rowKey && item.columnKey === columnKey);
      return match ? { ...match.seat, columnKey } : null;
    })
  }));

  return {
    isGrid: true as const,
    columns: columnKeys,
    rows
  };
};
