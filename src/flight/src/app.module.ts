import { MiddlewareConsumer, Module, NestModule, OnApplicationBootstrap } from '@nestjs/common';
import { APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresOptions } from '@/data/data-source';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { FlightModule } from '@/flight/flight.module';
import { AircraftModule } from '@/aircraft/aircraft.module';
import { AirportModule } from '@/airport/airport.module';
import { SeatModule } from '@/seat/seat.module';
import { DataSeeder } from '@/data/seeds/data-seeder';
import { JwtStrategy } from 'building-blocks/passport/jwt.strategy';
import configs from 'building-blocks/configs/configs';
import { RequestContextMiddleware } from 'building-blocks/context/context';
import { IdentityAuthDependencyHealthService } from 'building-blocks/health/identity-auth-dependency-health.service';
import { OpenTelemetryModule } from 'building-blocks/openTelemetry/opentelemetry.module';
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
    FlightModule,
    AircraftModule,
    AirportModule,
    SeatModule,
    RouterModule.register([
      {
        path: '/',
        module: FlightModule
      },
      {
        path: '/',
        module: AircraftModule
      },
      {
        path: '/',
        module: AirportModule
      },
      {
        path: '/',
        module: SeatModule
      }
    ])
  ],
  providers: [
    JwtStrategy,
    DataSeeder,
    IdentityAuthDependencyHealthService,
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
