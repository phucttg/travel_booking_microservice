import { UserDto } from '@/user/dtos/user.dto';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, NotFoundException, Query, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { IUserRepository } from '@/data/repositories/user.repository';
import { User } from '@/user/entities/user.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { Roles } from '@/common/auth/roles.decorator';
import { RolesGuard } from '@/common/auth/roles.guard';
import { Role } from '@/user/enums/role.enum';
import mapper from '@/user/mapping';
import { UserIdQueryDto } from '@/user/dtos/user-id-query.dto';

export class GetUserById {
  id: number;

  constructor(request: Partial<GetUserById> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Users')
@Controller({
  path: `/user`,
  version: '1'
})
export class GetUserByIdController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-by-id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  public async getUserById(@Query() query: UserIdQueryDto): Promise<UserDto> {
    const result = await this.queryBus.execute(new GetUserById({ id: query.id }));

    if (!result) {
      throw new NotFoundException('User not found');
    }

    return result;
  }
}

@QueryHandler(GetUserById)
export class GetUserByIdHandler implements IQueryHandler<GetUserById> {
  constructor(@Inject('IUserRepository') private readonly userRepository: IUserRepository) {}

  async execute(query: GetUserById): Promise<UserDto> {
    const userEntity = await this.userRepository.findUserById(query.id);

    if (!userEntity) {
      throw new NotFoundException('User not found');
    }

    return mapper.map<User, UserDto>(userEntity, new UserDto());
  }
}
