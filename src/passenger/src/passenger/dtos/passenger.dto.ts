import { PassengerType } from '@/passenger/enums/passenger-type.enum';

export class PassengerDto {
  id: number;
  userId: number;
  name: string;
  age: number;
  passportNumber: string;
  passengerType: PassengerType;
  createdAt: Date;
  updatedAt?: Date;
}
