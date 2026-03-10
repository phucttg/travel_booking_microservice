import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { SanitizedText, ToInteger } from 'building-blocks/validation/validation.decorators';

export class CreateAircraftRequestDto {
  @ApiProperty()
  @SanitizedText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;

  @ApiProperty()
  @SanitizedText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @ToInteger()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  manufacturingYear: number;
}
