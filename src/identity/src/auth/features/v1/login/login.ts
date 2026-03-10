import { GenerateToken } from '@/auth/features/v1/generate-token/generate-token';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Inject, Post } from '@nestjs/common';
import { AuthDto } from '@/auth/dtos/auth.dto';
import { LoginRequestDto } from '@/auth/dtos/login-request.dto';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IAuthRepository } from '@/data/repositories/auth.repository';
import { IUserRepository } from '@/data/repositories/user.repository';
import { isPasswordMatch } from 'building-blocks/utils/encryption';
import ApplicationException from 'building-blocks/types/exeptions/application.exception';

export class Login {
  email: string;
  password: string;

  constructor(request: Partial<Login> = {}) {
    Object.assign(this, request);
  }
}

@ApiBearerAuth()
@ApiTags('Identities')
@Controller({
  path: `/identity`,
  version: '1'
})
export class LoginController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('login')
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 200, description: 'OK' })
  public async login(@Body() request: LoginRequestDto): Promise<AuthDto> {
    return await this.commandBus.execute(new Login(request));
  }
}

@CommandHandler(Login)
export class LoginHandler implements ICommandHandler<Login> {
  constructor(
    @Inject('IAuthRepository') private readonly authRepository: IAuthRepository,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    private readonly commandBus: CommandBus
  ) {}

  async execute(command: Login): Promise<AuthDto> {
    const user = await this.userRepository.findUserByEmail(command.email);

    if (!user || !(await isPasswordMatch(command.password, user.password as string))) {
      throw new ApplicationException('Incorrect email or password');
    }

    return await this.commandBus.execute(new GenerateToken({ userId: user.id }));
  }
}
