import { IEvent } from '@nestjs/cqrs';
export declare enum Role {
    USER = 0,
    ADMIN = 1
}
export declare enum TokenType {
    ACCESS = 0,
    REFRESH = 1
}
export declare enum PassengerType {
    UNKNOWN = 0,
    MALE = 1,
    FEMALE = 2,
    BABY = 3
}
export declare class UserCreated implements IEvent {
    id: number;
    email: string;
    name: string;
    isEmailVerified: boolean;
    role: Role;
    passportNumber: string;
    age: number;
    passengerType: PassengerType;
    createdAt: Date;
    updatedAt?: Date;
    constructor(partial?: Partial<UserCreated>);
}
export declare class UserDeleted implements IEvent {
    id: number;
    email: string;
    name: string;
    isEmailVerified: boolean;
    role: Role;
    passportNumber: string;
    createdAt: Date;
    updatedAt?: Date;
    constructor(partial?: Partial<UserDeleted>);
}
export declare class UserUpdated implements IEvent {
    id: number;
    email: string;
    name: string;
    isEmailVerified: boolean;
    role: Role;
    passportNumber: string;
    age: number;
    passengerType: PassengerType;
    createdAt: Date;
    updatedAt?: Date;
    constructor(partial?: Partial<UserUpdated>);
}
