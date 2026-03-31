import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from '@/auth/entities/token.entity';
import { AuthRepository } from '@/data/repositories/auth.repository';
import { LoginController, LoginHandler } from '@/auth/features/v1/login/login';
import { LogoutController, LogoutHandler } from '@/auth/features/v1/logout/logout';
import {
  RefreshTokenController,
  RefreshTokenHandler
} from '@/auth/features/v1/refresh-token/refresh-token';
import { GenerateTokenHandler } from '@/auth/features/v1/generate-token/generate-token';
import {
  ValidateAccessTokenController,
  ValidateTokenHandler
} from '@/auth/features/v1/validate-token/validate-token';
import { User } from '@/user/entities/user.entity';
import { UserRepository } from '@/data/repositories/user.repository';
import { RabbitmqModule } from 'building-blocks/rabbitmq/rabbitmq.module';
import { RegisterController, RegisterHandler } from '@/auth/features/v1/register/register';
import { IdentityUserWriteService } from '@/user/services/identity-user-write.service';
import { IdentityUserEventPublisherService } from '@/user/services/identity-user-event-publisher.service';
import { InternalOnlyGuard } from 'building-blocks/internal-auth/internal-only.guard';
import { AuthDependencyHealthController } from '@/auth/features/internal/auth-dependency-health';

@Module({
  imports: [CqrsModule, RabbitmqModule.forRoot(), TypeOrmModule.forFeature([Token, User])],
  controllers: [
    LoginController,
    LogoutController,
    RefreshTokenController,
    ValidateAccessTokenController,
    RegisterController,
    AuthDependencyHealthController
  ],
  providers: [
    LoginHandler,
    GenerateTokenHandler,
    LogoutHandler,
    RefreshTokenHandler,
    ValidateTokenHandler,
    RegisterHandler,
    IdentityUserWriteService,
    IdentityUserEventPublisherService,
    InternalOnlyGuard,
    {
      provide: 'IAuthRepository',
      useClass: AuthRepository
    },
    {
      provide: 'IUserRepository',
      useClass: UserRepository
    }
  ],
  exports: []
})
export class AuthModule {}
