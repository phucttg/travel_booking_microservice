import { useAuthStore } from '@stores/auth.store';
import { AircraftDto } from '@/types/aircraft.types';
import { AirportDto } from '@/types/airport.types';
import { BookingDto } from '@/types/booking.types';
import { FlightDto } from '@/types/flight.types';
import { PassengerDto } from '@/types/passenger.types';
import { SeatDto } from '@/types/seat.types';
import { UserDto } from '@/types/user.types';
import { BookingStatus, FlightStatus, PassengerType, Role, SeatClass, SeatType } from '@/types/enums';

const now = '2099-01-01T00:00:00.000Z';

export const airports: AirportDto[] = [
  {
    id: 1,
    code: 'SGN',
    name: 'Tan Son Nhat',
    address: 'Ho Chi Minh City',
    createdAt: now
  },
  {
    id: 2,
    code: 'HAN',
    name: 'Noi Bai',
    address: 'Ha Noi',
    createdAt: now
  }
];

export const aircrafts: AircraftDto[] = [
  {
    id: 1,
    model: 'A321',
    name: 'Airbus A321',
    manufacturingYear: 2020,
    createdAt: now
  }
];

export const makeFlight = (overrides: Partial<FlightDto> = {}): FlightDto => ({
  id: 1,
  flightNumber: 'VN123',
  price: 1500000,
  flightStatus: FlightStatus.SCHEDULED,
  flightDate: '2099-03-10T00:00:00.000Z',
  departureDate: '2099-03-10T08:00:00.000Z',
  departureAirportId: 1,
  aircraftId: 1,
  arriveDate: '2099-03-10T10:00:00.000Z',
  arriveAirportId: 2,
  durationMinutes: 120,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const makeSeat = (overrides: Partial<SeatDto> = {}): SeatDto => ({
  id: 1,
  seatNumber: '1A',
  seatClass: SeatClass.BUSINESS,
  seatType: SeatType.WINDOW,
  flightId: 1,
  isReserved: false,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const makeBooking = (overrides: Partial<BookingDto> = {}): BookingDto => ({
  id: 1,
  flightId: 1,
  userId: 42,
  passengerId: 7,
  flightNumber: 'VN123',
  aircraftId: 1,
  departureAirportId: 1,
  arriveAirportId: 2,
  flightDate: '2099-03-10T00:00:00.000Z',
  price: 1500000,
  description: 'Window seat',
  seatNumber: '1A',
  passengerName: 'Nguyen Van A',
  bookingStatus: BookingStatus.CONFIRMED,
  createdAt: now,
  updatedAt: now,
  canceledAt: null,
  ...overrides
});

export const makePassenger = (overrides: Partial<PassengerDto> = {}): PassengerDto => ({
  id: 7,
  userId: 42,
  name: 'Nguyen Van A',
  age: 18,
  passportNumber: 'B1234567',
  passengerType: PassengerType.MALE,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const makeUser = (overrides: Partial<UserDto> = {}): UserDto => ({
  id: 42,
  email: 'user@example.com',
  name: 'Nguyen Van A',
  isEmailVerified: true,
  role: Role.USER,
  passportNumber: 'B1234567',
  age: 18,
  passengerType: PassengerType.MALE,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildJwtToken = (userId: number) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: 4102444800
    })
  ).toString('base64url');

  return `${header}.${payload}.`;
};

export const setAuthenticatedUser = (userOverrides: Partial<UserDto> = {}) => {
  const user = makeUser(userOverrides);
  useAuthStore.setState({
    accessToken: buildJwtToken(user.id),
    refreshToken: 'mock-refresh-token',
    user,
    isAuthenticated: true,
    authInitialized: true
  });

  return user;
};
