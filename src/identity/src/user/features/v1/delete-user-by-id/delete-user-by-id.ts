import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Delete, Inject, NotFoundException, Query, UseGuards } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserDto } from '@/user/dtos/user.dto';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { IUserRepository } from '@/data/repositories/user.repository';
import { User } from '@/user/entities/user.entity';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { UserDeleted } from 'building-blocks/contracts/identity.contract';
import { Roles } from '@/common/auth/roles.decorator';
import { RolesGuard } from '@/common/auth/roles.guard';
import { Role } from '@/user/enums/role.enum';
import mapper from '@/user/mapping';
import { UserIdQueryDto } from '@/user/dtos/user-id-query.dto';

export class DeleteUserById {
  id: number;

  constructor(request: Partial<DeleteUserById> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Users')
@Controller({
  path: `/user`,
  version: '1'
})
export class DeleteUserByIdController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete('delete')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  public async deleteUserById(@Query() query: UserIdQueryDto): Promise<UserDto> {
    return await this.commandBus.execute(new DeleteUserById({ id: query.id }));
  }
}

@CommandHandler(DeleteUserById)
export class DeleteUserByIdHandler implements ICommandHandler<DeleteUserById> {
  constructor(
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository
  ) {}

  async execute(command: DeleteUserById): Promise<UserDto> {
    const userEntity = await this.userRepository.findUserById(command.id);

    if (!userEntity) {
      throw new NotFoundException('User not found');
    }

    const deletedUser = await this.userRepository.removeUser(userEntity);
    await this.rabbitmqPublisher.publishMessage(new UserDeleted(deletedUser));

    return mapper.map<User, UserDto>(deletedUser, new UserDto());
  }
}
