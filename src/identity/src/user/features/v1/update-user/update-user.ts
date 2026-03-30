import { Role } from '@/user/enums/role.enum';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  ConflictException,
  Controller,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Put,
  Res,
  UseGuards
} from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Response } from 'express';
import { IUserRepository } from '@/data/repositories/user.repository';
import { User } from '@/user/entities/user.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { encryptPassword } from 'building-blocks/utils/encryption';
import { Roles } from '@/common/auth/roles.decorator';
import { RolesGuard } from '@/common/auth/roles.guard';
import { UpdateUserRequestDto } from '@/user/dtos/update-user-request.dto';
import { UserIdParamDto } from '@/user/dtos/user-id-param.dto';
import { PassengerType } from '@/user/enums/passenger-type.enum';
import { IdentityUserEventPublisherService } from '@/user/services/identity-user-event-publisher.service';

export class UpdateUser {
  id: number;
  email: string;
  password?: string;
  name: string;
  role: Role;
  passportNumber: string;
  age: number;
  passengerType: PassengerType;

  constructor(request: Partial<UpdateUser> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Users')
@Controller({
  path: `/user`,
  version: '1'
})
export class UpdateUserController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put('update/:id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @ApiResponse({ status: 204, description: 'NO_CONTENT' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  public async updateUser(
    @Param() params: UserIdParamDto,
    @Body() request: UpdateUserRequestDto,
    @Res() res: Response
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateUser({
        id: params.id,
        ...request
      })
    );

    res.status(HttpStatus.NO_CONTENT).send(null);
  }
}

@CommandHandler(UpdateUser)
export class UpdateUserHandler implements ICommandHandler<UpdateUser> {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    private readonly identityUserEventPublisherService: IdentityUserEventPublisherService
  ) {}

  async execute(command: UpdateUser): Promise<void> {
    const existUser = await this.userRepository.findUserById(command.id);

    if (!existUser) {
      throw new NotFoundException('User not found');
    }

    const existingUserWithEmail = await this.userRepository.findUserByEmail(command.email);

    if (existingUserWithEmail && existingUserWithEmail.id !== command.id) {
      throw new ConflictException('Email already taken');
    }

    const updateUserEntity = new User({
      id: command.id,
      email: command.email,
      name: command.name,
      password: command.password ? await encryptPassword(command.password) : existUser.password,
      role: command.role,
      passportNumber: command.passportNumber,
      age: command.age,
      passengerType: command.passengerType,
      isEmailVerified: existUser.isEmailVerified,
      tokens: existUser.tokens,
      createdAt: existUser.createdAt,
      updatedAt: new Date()
    });

    await this.userRepository.updateUser(updateUserEntity);
    await this.identityUserEventPublisherService.publishUserUpdated(updateUserEntity);
  }
}
