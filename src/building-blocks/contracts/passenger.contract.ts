export class PassengerDto {
  id: number;
  userId: number;
  name: string;
  age: number;
  passportNumber: string;
  passengerType: PassengerType;
  createdAt: Date;
  updatedAt?: Date;

  constructor(partial?: Partial<PassengerDto>) {
    Object.assign(this, partial);
  }
}

export enum PassengerType {
  UNKNOWN = 0,
  MALE,
  FEMALE,
  BABY
}
