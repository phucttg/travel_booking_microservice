import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
