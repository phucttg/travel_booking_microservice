import { PassengerType } from '@/types/enums';

export interface PassengerDto {
  id: number;
  userId: number;
  name: string;
  age: number;
  passportNumber: string;
  passengerType: PassengerType;
  createdAt: string | Date;
  updatedAt?: string | Date;
}
