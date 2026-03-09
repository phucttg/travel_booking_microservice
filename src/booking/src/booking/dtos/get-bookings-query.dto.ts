import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_PAGE_SIZE } from 'building-blocks/validation/validation.constants';
import { ToInteger } from 'building-blocks/validation/validation.decorators';

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
}
