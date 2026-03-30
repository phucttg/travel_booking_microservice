import { SeatState } from '@/seat/enums/seat-state.enum';

export class SeatStateDto {
  id: number;
  seatNumber: string;
  flightId: number;
  seatState: SeatState;
  isReserved: boolean;
  holdExpiresAt?: Date | null;
  reservedBookingId?: number | null;
  updatedAt?: Date | null;

  constructor(request: Partial<SeatStateDto> = {}) {
    Object.assign(this, request);
  }
}
