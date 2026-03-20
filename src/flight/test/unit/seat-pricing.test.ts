import { calculateSeatPrice } from '@/seat/utils/seat-pricing';
import { SeatClass } from '@/seat/enums/seat-class.enum';

describe('seat pricing', () => {
  it('applies class multipliers to the base fare', () => {
    expect(calculateSeatPrice(1000000, SeatClass.ECONOMY)).toBe(1000000);
    expect(calculateSeatPrice(1000000, SeatClass.BUSINESS)).toBe(1750000);
    expect(calculateSeatPrice(1000000, SeatClass.FIRST_CLASS)).toBe(2500000);
  });
});
