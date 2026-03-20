import { IEvent } from '@nestjs/cqrs';
import { SeatClass } from './flight.contract';
export declare enum BookingStatus {
    PENDING_PAYMENT = 0,
    CONFIRMED = 1,
    EXPIRED = 2,
    CANCELED = 3
}
export declare class BookingCreated implements IEvent {
    id: number;
    flightNumber: string;
    flightId: number;
    aircraftId: number;
    departureAirportId: number;
    arriveAirportId: number;
    flightDate: Date;
    price: number;
    seatClass: SeatClass;
    currency: string;
    description: string;
    seatNumber: string;
    passengerName: string;
    userId: number;
    passengerId: number;
    bookingStatus: BookingStatus;
    createdAt: Date;
    paymentId?: number | null;
    paymentExpiresAt?: Date | null;
    confirmedAt?: Date | null;
    updatedAt?: Date | null;
    canceledAt?: Date | null;
    expiredAt?: Date | null;
    constructor(partial?: Partial<BookingCreated>);
}
