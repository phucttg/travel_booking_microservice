import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateAccessTokenRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
