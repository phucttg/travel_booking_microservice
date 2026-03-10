import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { PASSPORT_NUMBER_REGEX, PASSWORD_REGEX } from 'building-blocks/validation/validation.constants';
import { SanitizedText, ToInteger, TrimmedText } from 'building-blocks/validation/validation.decorators';
import { Role } from '@/user/enums/role.enum';
import { PassengerType } from '@/user/enums/passenger-type.enum';

export class UpdateUserRequestDto {
  @ApiPropertyOptional()
  @TrimmedText()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    return value.trim() === '' ? undefined : value;
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(PASSWORD_REGEX)
  password?: string;

  @ApiPropertyOptional()
  @SanitizedText()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ enum: Role, enumName: 'Role' })
  @ToInteger()
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional()
  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @Matches(PASSPORT_NUMBER_REGEX)
  passportNumber: string;

  @ApiPropertyOptional()
  @ToInteger()
  @IsInt()
  @Min(0)
  age: number;

  @ApiPropertyOptional({ enum: PassengerType, enumName: 'PassengerType' })
  @ToInteger()
  @IsEnum(PassengerType)
  passengerType: PassengerType;
}
