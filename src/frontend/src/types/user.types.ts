import { PassengerType, Role } from '@/types/enums';

export interface UserDto {
  id: number;
  email: string;
  name: string;
  isEmailVerified: boolean;
  role: Role;
  passportNumber: string;
  age: number;
  passengerType: PassengerType;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: Role;
  passportNumber: string;
  age: number;
  passengerType: PassengerType;
}

export interface UpdateUserRequest {
  email: string;
  password?: string;
  name: string;
  role: Role;
  passportNumber: string;
  age: number;
  passengerType: PassengerType;
}
