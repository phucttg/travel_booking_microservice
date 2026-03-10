import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AIRPORT_CODE_REGEX } from 'building-blocks/validation/validation.constants';
import { SanitizedText, UppercaseText } from 'building-blocks/validation/validation.decorators';

export class CreateAirportRequestDto {
  @ApiProperty()
  @UppercaseText()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(10)
  @Matches(AIRPORT_CODE_REGEX)
  code: string;

  @ApiProperty()
  @SanitizedText()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @SanitizedText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;
}
