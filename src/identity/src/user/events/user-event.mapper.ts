import {
  PassengerType as ContractPassengerType,
  Role as ContractRole,
  UserCreated,
  UserDeleted,
  UserUpdated
} from 'building-blocks/contracts/identity.contract';
import { User } from '@/user/entities/user.entity';

type BaseUserEventPayload = {
  id: number;
  email: string;
  name: string;
  isEmailVerified: boolean;
  role: ContractRole;
  passportNumber: string;
  age: number;
  passengerType: ContractPassengerType;
  createdAt: Date;
  updatedAt?: Date;
};

const mapUserToBasePayload = (user: User): BaseUserEventPayload => ({
  id: user.id,
  email: user.email,
  name: user.name,
  isEmailVerified: user.isEmailVerified,
  role: user.role as unknown as ContractRole,
  passportNumber: user.passportNumber,
  age: user.age,
  passengerType: user.passengerType as unknown as ContractPassengerType,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt || undefined
});

export const mapUserToUserCreatedEvent = (user: User): UserCreated =>
  new UserCreated(mapUserToBasePayload(user));

export const mapUserToUserUpdatedEvent = (user: User): UserUpdated =>
  new UserUpdated(mapUserToBasePayload(user));

export const mapUserToUserDeletedEvent = (user: User): UserDeleted => {
  const basePayload = mapUserToBasePayload(user);

  return new UserDeleted({
    id: basePayload.id,
    email: basePayload.email,
    name: basePayload.name,
    isEmailVerified: basePayload.isEmailVerified,
    role: basePayload.role,
    passportNumber: basePayload.passportNumber,
    createdAt: basePayload.createdAt,
    updatedAt: basePayload.updatedAt
  });
};
