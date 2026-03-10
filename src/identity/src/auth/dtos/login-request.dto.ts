import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_REGEX } from 'building-blocks/validation/validation.constants';
import { TrimmedText } from 'building-blocks/validation/validation.decorators';

export class LoginRequestDto {
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
}
