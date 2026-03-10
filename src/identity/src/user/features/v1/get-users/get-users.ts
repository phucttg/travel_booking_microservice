import { UserDto } from '@/user/dtos/user.dto';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { IUserRepository } from '@/data/repositories/user.repository';
import { User } from '@/user/entities/user.entity';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { PagedResult } from 'building-blocks/types/pagination/paged-result';
import { Roles } from '@/common/auth/roles.decorator';
import { RolesGuard } from '@/common/auth/roles.guard';
import { Role } from '@/user/enums/role.enum';
import mapper from '@/user/mapping';
import { GetUsersQueryDto } from '@/user/dtos/get-users-query.dto';

export class GetUsers {
  page = 1;
  pageSize = 10;
  orderBy = 'id';
  order: 'ASC' | 'DESC' = 'ASC';
  searchTerm?: string = null;

  constructor(request: Partial<GetUsers> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Users')
@Controller({
  path: `/user`,
  version: '1'
})
export class GetUsersController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'], example: 'ASC' })
  @ApiQuery({ name: 'orderBy', required: false, enum: ['id', 'name', 'email'], example: 'id' })
  @ApiQuery({ name: 'searchTerm', required: false, type: String })
  public async getUsers(@Query() query: GetUsersQueryDto): Promise<PagedResult<UserDto[]>> {
    return await this.queryBus.execute(new GetUsers(query));
  }
}

@QueryHandler(GetUsers)
export class GetUsersHandler implements IQueryHandler<GetUsers> {
  constructor(@Inject('IUserRepository') private readonly userRepository: IUserRepository) {}

  async execute(command: GetUsers): Promise<PagedResult<UserDto[]>> {
    const normalizedSearchTerm = command.searchTerm || null;

    const [usersEntity, total] = await this.userRepository.findUsers(
      command.page,
      command.pageSize,
      command.orderBy,
      command.order,
      normalizedSearchTerm
    );

    if (usersEntity?.length === 0) {
      return new PagedResult<UserDto[]>(null, total);
    }

    const result = usersEntity.map((user) => mapper.map<User, UserDto>(user, new UserDto()));

    return new PagedResult<UserDto[]>(result, total);
  }
}
