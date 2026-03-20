import { SeatClass } from '@/seat/enums/seat-class.enum';

const seatClassMultipliers: Record<SeatClass, number> = {
  [SeatClass.UNKNOWN]: 1,
  [SeatClass.FIRST_CLASS]: 2.5,
  [SeatClass.BUSINESS]: 1.75,
  [SeatClass.ECONOMY]: 1
};

export const calculateSeatPrice = (basePrice: number, seatClass: SeatClass): number => {
  const multiplier = seatClassMultipliers[seatClass] ?? 1;
  return Math.round(basePrice * multiplier);
};
