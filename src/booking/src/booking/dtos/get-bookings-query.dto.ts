import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_PAGE_SIZE } from 'building-blocks/validation/validation.constants';
import { ToInteger } from 'building-blocks/validation/validation.decorators';

const toBooleanQueryValue = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return value;
};

export class GetBookingsQueryDto {
  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize = 10;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsIn(['id', 'createdAt', 'price', 'flightDate'])
  orderBy = 'id';

  @IsOptional()
  @Transform(({ value }) => toBooleanQueryValue(value))
  @IsBoolean()
  includePaymentSummary = true;
}
