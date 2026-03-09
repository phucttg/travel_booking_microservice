import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_PAGE_SIZE } from './validation.constants';
import { OptionalSanitizedText, ToInteger } from './validation.decorators';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

export class BasePaginationQueryDto {
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
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.ASC;

  @IsOptional()
  @OptionalSanitizedText()
  searchTerm?: string;
}
