import { UserDto } from '@/user/dtos/user.dto';
import { Role } from '@/user/enums/role.enum';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Response } from 'express';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { Roles } from '@/common/auth/roles.decorator';
import { RolesGuard } from '@/common/auth/roles.guard';
import { CreateUserRequestDto } from '@/user/dtos/create-user-request.dto';
import { PassengerType } from '@/user/enums/passenger-type.enum';
import { IdentityUserWriteService } from '@/user/services/identity-user-write.service';

export class CreateUser {
  email: string;
  password: string;
  name: string;
  role: Role;
  passportNumber: string;
  age: number;
  passengerType: PassengerType;

  constructor(request: Partial<CreateUser> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Users')
@Controller({
  path: `/user`,
  version: '1'
})
export class CreateUserController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('create')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 201, description: 'CREATED' })
  public async createUser(
    @Body() request: CreateUserRequestDto,
    @Res() res: Response
  ): Promise<UserDto> {
    const result = await this.commandBus.execute(new CreateUser(request));

    res.status(HttpStatus.CREATED).send(result);

    return result;
  }
}

@CommandHandler(CreateUser)
export class CreateUserHandler implements ICommandHandler<CreateUser> {
  constructor(private readonly identityUserWriteService: IdentityUserWriteService) {}

  async execute(command: CreateUser): Promise<UserDto> {
    return await this.identityUserWriteService.createUser({
      ...command,
      isEmailVerified: false
    });
  }
}
