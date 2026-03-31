import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'building-blocks/passport/jwt.strategy';
import { RequestContextMiddleware } from 'building-blocks/context/context';
import { OpenTelemetryModule } from 'building-blocks/openTelemetry/opentelemetry.module';
import configs from 'building-blocks/configs/configs';
import { postgresOptions } from '@/data/data-source';
import { PaymentModule } from '@/payment/payment.module';
import { IdentityAuthDependencyHealthService } from 'building-blocks/health/identity-auth-dependency-health.service';
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
    PaymentModule,
    RouterModule.register([
      {
        path: '/',
        module: PaymentModule
      }
    ])
  ],
  providers: [
    JwtStrategy,
    RateLimitService,
    IdentityAuthDependencyHealthService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
