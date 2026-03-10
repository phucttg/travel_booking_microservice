import jwt from 'jsonwebtoken';
import { TokenType } from '@/auth/enums/token-type.enum';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, HttpStatus, Inject, NotFoundException, Post, Res } from '@nestjs/common';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { IAuthRepository } from '@/data/repositories/auth.repository';
import { Token } from '@/auth/entities/token.entity';
import configs from 'building-blocks/configs/configs';
import { ToInteger } from 'building-blocks/validation/validation.decorators';
import { validateModel } from 'building-blocks/validation/validation.utils';
import { Response } from 'express';
import { ValidateAccessTokenRequestDto } from '@/auth/dtos/validate-access-token-request.dto';

export class ValidateToken {
  @IsString()
  @IsNotEmpty()
  token: string;

  @ToInteger()
  @IsEnum(TokenType)
  type: TokenType;

  constructor(request: Partial<ValidateToken> = {}) {
    Object.assign(this, request);
  }
}

@ApiTags('Identities')
@Controller({
  path: `/identity`,
  version: '1'
})
export class ValidateAccessTokenController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('validate-access-token')
  @ApiResponse({ status: 204, description: 'NO_CONTENT' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  public async validateAccessToken(
    @Body() request: ValidateAccessTokenRequestDto,
    @Res() res: Response
  ): Promise<void> {
    await this.commandBus.execute(
      new ValidateToken({
        token: request.accessToken,
        type: TokenType.ACCESS
      })
    );

    res.status(HttpStatus.NO_CONTENT).send(null);
  }
}

@CommandHandler(ValidateToken)
export class ValidateTokenHandler implements ICommandHandler<ValidateToken> {
  constructor(@Inject('IAuthRepository') private readonly authRepository: IAuthRepository) {}

  async execute(command: ValidateToken): Promise<Token> {
    const validatedCommand = validateModel(ValidateToken, command);
    const payload = jwt.verify(validatedCommand.token, configs.jwt.secret);
    const userId = Number(payload.sub);

    const token =
      validatedCommand.type === TokenType.REFRESH
        ? await this.authRepository.findRefreshTokenByUserId(validatedCommand.token, userId, false)
        : await this.authRepository.findTokenByUserId(validatedCommand.token, userId, false);

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return token;
  }
}
