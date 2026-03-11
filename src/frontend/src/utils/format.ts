import dayjs from 'dayjs';
import { BookingStatus, FlightStatus, PassengerType, Role, SeatClass, SeatType } from '@/types/enums';

export const formatDateTime = (value?: string | Date | null, format = 'DD/MM/YYYY HH:mm') => {
  if (!value) return '-';
  return dayjs(value).format(format);
};

export const formatCurrency = (value?: number | null, currency = 'VND') => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
};

export const formatDuration = (minutes?: number | null): string => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '--';
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const roleLabels: Record<Role, string> = {
  [Role.USER]: 'User',
  [Role.ADMIN]: 'Admin'
};

export const roleColors: Record<Role, string> = {
  [Role.USER]: 'blue',
  [Role.ADMIN]: 'volcano'
};

export const flightStatusLabels: Record<FlightStatus, string> = {
  [FlightStatus.UNKNOWN]: 'Unknown',
  [FlightStatus.FLYING]: 'Flying',
  [FlightStatus.DELAY]: 'Delayed',
  [FlightStatus.CANCELED]: 'Canceled',
  [FlightStatus.COMPLETED]: 'Completed',
  [FlightStatus.SCHEDULED]: 'Scheduled'
};

export const flightStatusColors: Record<FlightStatus, string> = {
  [FlightStatus.UNKNOWN]: 'default',
  [FlightStatus.FLYING]: 'blue',
  [FlightStatus.DELAY]: 'orange',
  [FlightStatus.CANCELED]: 'red',
  [FlightStatus.COMPLETED]: 'green',
  [FlightStatus.SCHEDULED]: 'cyan'
};

export const bookingStatusLabels: Record<BookingStatus, string> = {
  [BookingStatus.CONFIRMED]: 'Confirmed',
  [BookingStatus.CANCELED]: 'Canceled'
};

export const seatClassLabels: Record<SeatClass, string> = {
  [SeatClass.UNKNOWN]: 'Unknown',
  [SeatClass.FIRST_CLASS]: 'First Class',
  [SeatClass.BUSINESS]: 'Business',
  [SeatClass.ECONOMY]: 'Economy'
};

export const seatClassColors: Record<SeatClass, string> = {
  [SeatClass.UNKNOWN]: 'default',
  [SeatClass.FIRST_CLASS]: 'gold',
  [SeatClass.BUSINESS]: 'blue',
  [SeatClass.ECONOMY]: 'green'
};

export const seatTypeLabels: Record<SeatType, string> = {
  [SeatType.UNKNOWN]: 'Unknown',
  [SeatType.WINDOW]: 'Window',
  [SeatType.MIDDLE]: 'Middle',
  [SeatType.AISLE]: 'Aisle'
};

export const passengerTypeLabels: Record<PassengerType, string> = {
  [PassengerType.UNKNOWN]: 'Unknown',
  [PassengerType.MALE]: 'Male',
  [PassengerType.FEMALE]: 'Female',
  [PassengerType.BABY]: 'Baby'
};

export const passengerTypeColors: Record<PassengerType, string> = {
  [PassengerType.UNKNOWN]: 'default',
  [PassengerType.MALE]: 'blue',
  [PassengerType.FEMALE]: 'pink',
  [PassengerType.BABY]: 'cyan'
};
