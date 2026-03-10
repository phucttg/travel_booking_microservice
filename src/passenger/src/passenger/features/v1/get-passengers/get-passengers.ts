import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Query,
  Req,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { PassengerDto } from '@/passenger/dtos/passenger.dto';
import { IPassengerRepository } from '@/data/repositories/passenger.repository';
import { PagedResult } from 'building-blocks/types/pagination/paged-result';
import { Passenger } from '@/passenger/entities/passenger.entity';
import mapper from '@/passenger/mappings';
import { GetPassengersQueryDto } from '@/passenger/dtos/get-passengers-query.dto';
import { Role } from 'building-blocks/contracts/identity.contract';
import { Request } from 'express';

type JwtRequest = Request & {
  user?: {
    role?: number | string;
  };
};

export class GetPassengers {
  page = 1;
  pageSize = 10;
  orderBy = 'id';
  order: 'ASC' | 'DESC' = 'ASC';
  searchTerm?: string = null;
  isAdmin = false;

  constructor(request: Partial<GetPassengers> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Passengers')
@Controller({
    path: `/passenger`,
    version: '1',
})
export class GetPassengersController {
  constructor(private readonly queryBus: QueryBus) {}
  @Get('get-all')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'], example: 'ASC' })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: ['id', 'name', 'passportNumber', 'createdAt'],
    example: 'id'
  })
  @ApiQuery({ name: 'searchTerm', required: false, type: String })
  public async getPassengers(
    @Query() query: GetPassengersQueryDto,
    @Req() request: JwtRequest
  ): Promise<PagedResult<PassengerDto[]>> {
    const role = Number(request.user?.role);

    if (Number.isNaN(role)) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return await this.queryBus.execute(
      new GetPassengers({
        ...query,
        isAdmin: role === Role.ADMIN
      })
    );
  }
}

@QueryHandler(GetPassengers)
export class GetPassengersHandler implements IQueryHandler<GetPassengers> {
  constructor(@Inject('IPassengerRepository') private readonly passengerRepository: IPassengerRepository) {}

  async execute(query: GetPassengers): Promise<PagedResult<PassengerDto[]>> {
    if (!query.isAdmin) {
      throw new ForbiddenException('Passenger list is restricted to administrators');
    }

    const normalizedSearchTerm = query.searchTerm || null;

    const [passengersEntity, total] = await this.passengerRepository.findPassengers(
      query.page,
      query.pageSize,
      query.orderBy,
      query.order,
      normalizedSearchTerm
    );

    if (passengersEntity?.length === 0) return new PagedResult<PassengerDto[]>(null, total);

    const result = passengersEntity.map((user) => mapper.map<Passenger, PassengerDto>(user, new PassengerDto()));

    return new PagedResult<PassengerDto[]>(result, total);
  }
}
