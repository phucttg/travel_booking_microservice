import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aircraft } from '@/aircraft/entities/aircraft.entity';
import { AircraftRepository } from '@/data/repositories/aircraftRepository';
import {
  CreateAircraftController,
  CreateAircraftHandler
} from '@/aircraft/features/v1/create-aircraft/create-aircraft';
import {
  GetAircraftsController,
  GetAircraftsHandler
} from '@/aircraft/features/v1/get-aircrafts/get-aircrafts';
import {
  GetAircraftByIdController,
  GetAircraftByIdHandler
} from '@/aircraft/features/v1/get-aircraft-by-id/get-aircraft-by-id';
import { RabbitmqModule } from 'building-blocks/rabbitmq/rabbitmq.module';
import { RolesGuard } from '@/common/auth/roles.guard';

@Module({
  imports: [CqrsModule, RabbitmqModule.forRoot(), TypeOrmModule.forFeature([Aircraft])],
  controllers: [CreateAircraftController, GetAircraftsController, GetAircraftByIdController],
  providers: [
    CreateAircraftHandler,
    GetAircraftsHandler,
    GetAircraftByIdHandler,
    RolesGuard,
    {
      provide: 'IAircraftRepository',
      useClass: AircraftRepository
    }
  ],
  exports: []
})
export class AircraftModule {}
