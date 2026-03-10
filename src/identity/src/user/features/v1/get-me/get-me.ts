import { UserDto } from '@/user/dtos/user.dto';
import { GetUserById } from '@/user/features/v1/get-user-by-id/get-user-by-id';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  NotFoundException,
  Req,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { Request } from 'express';

type JwtRequest = Request & {
  user?: {
    userId?: number | string;
  };
};

@ApiBearerAuth()
@ApiTags('Users')
@Controller({
  path: `/user`,
  version: '1'
})
export class GetMeController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  public async getMe(@Req() request: JwtRequest): Promise<UserDto> {
    const rawUserId = request.user?.userId;
    const userId = Number(rawUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const result = await this.queryBus.execute(new GetUserById({ id: userId }));

    if (!result) {
      throw new NotFoundException('User not found');
    }

    return result;
  }
}
