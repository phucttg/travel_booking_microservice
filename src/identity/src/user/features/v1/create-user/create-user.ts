import { UserDto } from '@/user/dtos/user.dto';
import { Role } from '@/user/enums/role.enum';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  ConflictException,
  Controller,
  HttpStatus,
  Inject,
  Post,
  Res,
  UseGuards
} from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { User } from '@/user/entities/user.entity';
import { IUserRepository } from '@/data/repositories/user.repository';
import { Response } from 'express';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { UserCreated } from 'building-blocks/contracts/identity.contract';
import { encryptPassword } from 'building-blocks/utils/encryption';
import { Roles } from '@/common/auth/roles.decorator';
import { RolesGuard } from '@/common/auth/roles.guard';
import mapper from '@/user/mapping';
import { CreateUserRequestDto } from '@/user/dtos/create-user-request.dto';
import { PassengerType } from '@/user/enums/passenger-type.enum';

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
  constructor(
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository
  ) {}
  async execute(command: CreateUser): Promise<UserDto> {
    const existUser = await this.userRepository.findUserByEmail(command.email);

    if (existUser) {
      throw new ConflictException('Email already taken');
    }

    const userEntity = await this.userRepository.createUser(
      new User({
        email: command.email,
        name: command.name,
        password: await encryptPassword(command.password),
        role: command.role,
        passportNumber: command.passportNumber,
        age: command.age,
        passengerType: command.passengerType,
        isEmailVerified: false
      })
    );

    await this.rabbitmqPublisher.publishMessage(new UserCreated(userEntity), {
      useEnvelope: true
    });

    return mapper.map<User, UserDto>(userEntity, new UserDto());
  }
}
