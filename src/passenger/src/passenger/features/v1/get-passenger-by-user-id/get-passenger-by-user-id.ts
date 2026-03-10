import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Query,
  Req,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { PassengerDto } from '@/passenger/dtos/passenger.dto';
import { IPassengerRepository } from '@/data/repositories/passenger.repository';
import { Passenger } from '@/passenger/entities/passenger.entity';
import mapper from '@/passenger/mappings';
import { PassengerUserIdQueryDto } from '@/passenger/dtos/passenger-user-id-query.dto';
import { Role } from 'building-blocks/contracts/identity.contract';
import { Request } from 'express';

type JwtRequest = Request & {
  user?: {
    userId?: number | string;
    role?: number | string;
  };
};

export class GetPassengerByUserId {
  userId: number;
  currentUserId: number;
  isAdmin: boolean;

  constructor(request: Partial<GetPassengerByUserId> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Passengers')
@Controller({
  path: `/passenger`,
  version: '1'
})
export class GetPassengerByUserIdController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-by-user-id')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  public async getPassengerByUserId(
    @Query() query: PassengerUserIdQueryDto,
    @Req() request: JwtRequest
  ): Promise<PassengerDto> {
    const currentUserId = Number(request.user?.userId);
    const role = Number(request.user?.role);

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const result = await this.queryBus.execute(
      new GetPassengerByUserId({
        userId: query.userId,
        currentUserId,
        isAdmin: role === Role.ADMIN
      })
    );

    if (!result) {
      throw new NotFoundException('Passenger not found');
    }

    return result;
  }
}

@QueryHandler(GetPassengerByUserId)
export class GetPassengerByUserIdHandler implements IQueryHandler<GetPassengerByUserId> {
  constructor(@Inject('IPassengerRepository') private readonly passengerRepository: IPassengerRepository) {}

  async execute(query: GetPassengerByUserId): Promise<PassengerDto> {
    const passengerEntity = await this.passengerRepository.findPassengerByUserId(query.userId);

    if (!passengerEntity) {
      throw new NotFoundException('Passenger not found');
    }

    if (!query.isAdmin && query.userId !== query.currentUserId) {
      throw new ForbiddenException('Passenger access denied');
    }

    return mapper.map<Passenger, PassengerDto>(passengerEntity, new PassengerDto());
  }
}
