import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import {
  PASSPORT_NUMBER_REGEX,
  PASSWORD_REGEX
} from 'building-blocks/validation/validation.constants';
import { ToInteger, TrimmedText, SanitizedText } from 'building-blocks/validation/validation.decorators';
import { Role } from '@/user/enums/role.enum';
import { PassengerType } from '@/user/enums/passenger-type.enum';

export class CreateUserRequestDto {
  @ApiProperty()
  @TrimmedText()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(PASSWORD_REGEX)
  password: string;

  @ApiProperty()
  @SanitizedText()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  @ToInteger()
  @IsEnum(Role)
  role: Role;

  @ApiProperty()
  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @Matches(PASSPORT_NUMBER_REGEX)
  passportNumber: string;

  @ApiProperty()
  @ToInteger()
  @IsInt()
  @Min(0)
  age: number;

  @ApiProperty({ enum: PassengerType, enumName: 'PassengerType' })
  @ToInteger()
  @IsEnum(PassengerType)
  passengerType: PassengerType;
}
