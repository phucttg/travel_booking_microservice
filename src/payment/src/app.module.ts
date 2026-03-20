import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'building-blocks/passport/jwt.strategy';
import { RequestContextMiddleware } from 'building-blocks/context/context';
import { OpenTelemetryModule } from 'building-blocks/openTelemetry/opentelemetry.module';
import configs from 'building-blocks/configs/configs';
import { postgresOptions } from '@/data/data-source';
import { PaymentModule } from '@/payment/payment.module';

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
  providers: [JwtStrategy]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
