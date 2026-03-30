import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Response } from 'express';
import { RegisterRequestDto } from '@/auth/dtos/register-request.dto';
import { UserDto } from '@/user/dtos/user.dto';
import { PassengerType } from '@/user/enums/passenger-type.enum';
import { Role } from '@/user/enums/role.enum';
import { IdentityUserWriteService } from '@/user/services/identity-user-write.service';

export class Register {
  email: string;
  password: string;
  name: string;
  passportNumber: string;
  age: number;
  passengerType: PassengerType;

  constructor(request: Partial<Register> = {}) {
    Object.assign(this, request);
  }
}

@ApiTags('Identities')
@Controller({
  path: `/identity`,
  version: '1'
})
export class RegisterController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('register')
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 409, description: 'CONFLICT' })
  @ApiResponse({ status: 201, description: 'CREATED' })
  public async register(@Body() request: RegisterRequestDto, @Res() res: Response): Promise<UserDto> {
    const result = await this.commandBus.execute(new Register(request));

    res.status(HttpStatus.CREATED).send(result);

    return result;
  }
}

@CommandHandler(Register)
export class RegisterHandler implements ICommandHandler<Register> {
  constructor(private readonly identityUserWriteService: IdentityUserWriteService) {}

  async execute(command: Register): Promise<UserDto> {
    return await this.identityUserWriteService.createUser({
      ...command,
      role: Role.USER,
      isEmailVerified: false
    });
  }
}
