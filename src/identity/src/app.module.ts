import { MiddlewareConsumer, Module, NestModule, OnApplicationBootstrap } from '@nestjs/common';
import { APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@/user/user.module';
import { AuthModule } from '@/auth/auth.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'building-blocks/passport/jwt.strategy';
import configs from 'building-blocks/configs/configs';
import { DataSeeder } from '@/data/seeds/data-seeder';
import { RequestContextMiddleware } from 'building-blocks/context/context';
import { postgresOptions } from '@/data/data-source';
import { OpenTelemetryModule } from 'building-blocks/openTelemetry/opentelemetry.module';
import { IdentityUserEventPublisherService } from '@/user/services/identity-user-event-publisher.service';
import { RateLimitInterceptor } from 'building-blocks/rate-limit/rate-limit.interceptor';
import { RateLimitService } from 'building-blocks/rate-limit/rate-limit.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: configs.jwt.secret
    }),
    OpenTelemetryModule,
    TypeOrmModule.forRoot(postgresOptions),
    UserModule,
    AuthModule,
    RouterModule.register([
      {
        path: '/',
        module: UserModule
      },
      {
        path: '/',
        module: AuthModule
      }
    ])
  ],
  providers: [
    JwtStrategy,
    DataSeeder,
    IdentityUserEventPublisherService,
    RateLimitService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor
    }
  ]
})
export class AppModule implements OnApplicationBootstrap, NestModule {
  constructor(private readonly dataSeeder: DataSeeder) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!configs.bootstrap.seedEnabled) {
      return;
    }

    await this.dataSeeder.seedAsync();
  }
}
