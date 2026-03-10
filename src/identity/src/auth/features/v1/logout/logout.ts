import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  HttpStatus,
  Inject,
  NotFoundException,
  Post,
  Res,
  UseGuards
} from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Response } from 'express';
import { IAuthRepository } from '@/data/repositories/auth.repository';
import { IUserRepository } from '@/data/repositories/user.repository';
import { TokenType } from '@/auth/enums/token-type.enum';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { LogoutRequestDto } from '@/auth/dtos/logout-request.dto';

export class Logout {
  accessToken: string;

  constructor(request: Partial<Logout> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Identities')
@Controller({
  path: `/identity`,
  version: '1'
})
export class LogoutController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('logout')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 204, description: 'NO_CONTENT' })
  public async logout(@Body() request: LogoutRequestDto, @Res() res: Response): Promise<void> {
    await this.commandBus.execute(new Logout({ accessToken: request.accessToken }));

    res.status(HttpStatus.NO_CONTENT).send(null);
  }
}

@CommandHandler(Logout)
export class LogoutHandler implements ICommandHandler<Logout> {
  constructor(
    @Inject('IAuthRepository') private readonly authRepository: IAuthRepository,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository
  ) {}

  async execute(command: Logout): Promise<number> {
    const token = await this.authRepository.findToken(command.accessToken, TokenType.ACCESS);

    if (!token) {
      throw new NotFoundException('Access Token Not found');
    }

    const tokenEntity = await this.authRepository.removeToken(token);

    return tokenEntity?.userId;
  }
}
