import { SeatDto } from '@/seat/dtos/seat.dto';

export class SeatReservationDto extends SeatDto {
  holdToken?: string;
  holdExpiresAt?: Date | null;

  constructor(request: Partial<SeatReservationDto> = {}) {
    super(request);
    Object.assign(this, request);
  }
}
