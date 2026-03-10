import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Airport } from '@/airport/entities/airport.entity';
import { AirportRepository } from '@/data/repositories/airportRepository';
import {
  CreateAirportController,
  CreateAirportHandler
} from '@/airport/features/v1/create-airport/create-airport';
import {
  GetAirportsController,
  GetAirportsHandler
} from '@/airport/features/v1/get-airports/get-airports';
import {
  GetAirportByIdController,
  GetAirportByIdHandler
} from '@/airport/features/v1/get-airport-by-id/get-airport-by-id';
import { RabbitmqModule } from 'building-blocks/rabbitmq/rabbitmq.module';
import { RolesGuard } from '@/common/auth/roles.guard';

@Module({
  imports: [CqrsModule, RabbitmqModule.forRoot(), TypeOrmModule.forFeature([Airport])],
  controllers: [CreateAirportController, GetAirportsController, GetAirportByIdController],
  providers: [
    CreateAirportHandler,
    GetAirportsHandler,
    GetAirportByIdHandler,
    RolesGuard,
    {
      provide: 'IAirportRepository',
      useClass: AirportRepository
    }
  ],
  exports: []
})
export class AirportModule {}
