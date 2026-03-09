import { IEvent } from '@nestjs/cqrs';
export declare enum BookingStatus {
    CONFIRMED = 0,
    CANCELED = 1
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
    description: string;
    seatNumber: string;
    passengerName: string;
    userId: number;
    passengerId: number;
    bookingStatus: BookingStatus;
    createdAt: Date;
    updatedAt?: Date | null;
    canceledAt?: Date | null;
    constructor(partial?: Partial<BookingCreated>);
}
