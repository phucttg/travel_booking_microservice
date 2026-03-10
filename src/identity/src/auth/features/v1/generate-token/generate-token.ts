import moment from 'moment';
import jwt from 'jsonwebtoken';
import { TokenType } from '@/auth/enums/token-type.enum';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthDto } from '@/auth/dtos/auth.dto';
import { Inject, NotFoundException } from '@nestjs/common';
import { IAuthRepository } from '@/data/repositories/auth.repository';
import { Token } from '@/auth/entities/token.entity';
import configs from 'building-blocks/configs/configs';
import { IUserRepository } from '@/data/repositories/user.repository';
import { Role } from '@/user/enums/role.enum';
import { IsInt, Min } from 'class-validator';
import { ToInteger } from 'building-blocks/validation/validation.decorators';
import { validateModel } from 'building-blocks/validation/validation.utils';

export class GenerateToken {
  @ToInteger()
  @IsInt()
  @Min(1)
  userId: number;

  constructor(request: Partial<GenerateToken> = {}) {
    Object.assign(this, request);
  }
}

const generateJwtToken = (
  userId: number,
  expires: number,
  role: Role,
  type: TokenType,
  secret: string = configs.jwt.secret
): string => {
  const payload = {
    sub: userId,
    role: role,
    iat: moment().unix(),
    exp: expires,
    type
  };
  return jwt.sign(payload, secret);
};

@CommandHandler(GenerateToken)
export class GenerateTokenHandler implements ICommandHandler<GenerateToken> {
  constructor(
    @Inject('IAuthRepository') private readonly authRepository: IAuthRepository,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository
  ) {}

  async execute(command: GenerateToken): Promise<AuthDto> {
    const validatedCommand = validateModel(GenerateToken, command);
    const user = await this.userRepository.findUserById(validatedCommand.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const accessTokenExpires = moment().add(configs.jwt.accessExpirationMinutes, 'minutes');
    const accessToken = generateJwtToken(
      validatedCommand.userId,
      accessTokenExpires.unix(),
      user.role,
      TokenType.ACCESS
    );

    const refreshTokenExpires = moment().add(configs.jwt.refreshExpirationDays, 'days');
    const refreshToken = generateJwtToken(
      validatedCommand.userId,
      refreshTokenExpires.unix(),
      user.role,
      TokenType.REFRESH
    );

    await this.authRepository.createToken(
      new Token({
        token: accessToken,
        refreshToken: refreshToken,
        expires: accessTokenExpires.toDate(),
        type: TokenType.ACCESS,
        blacklisted: false,
        userId: validatedCommand.userId
      })
    );

    return new AuthDto({
      access: {
        token: accessToken,
        expires: accessTokenExpires.toDate()
      },
      refresh: {
        token: refreshToken,
        expires: refreshTokenExpires.toDate()
      }
    });
  }
}
