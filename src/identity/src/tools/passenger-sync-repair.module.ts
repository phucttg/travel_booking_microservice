import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitmqModule } from 'building-blocks/rabbitmq/rabbitmq.module';
import { OpenTelemetryModule } from 'building-blocks/openTelemetry/opentelemetry.module';
import { postgresOptions } from '@/data/data-source';
import { User } from '@/user/entities/user.entity';
import { UserRepository } from '@/data/repositories/user.repository';
import { PassengerSyncRepairService } from '@/tools/passenger-sync-repair.service';
import { IdentityUserEventPublisherService } from '@/user/services/identity-user-event-publisher.service';

@Module({
  imports: [OpenTelemetryModule, RabbitmqModule.forRoot(), TypeOrmModule.forRoot(postgresOptions), TypeOrmModule.forFeature([User])],
  providers: [
    PassengerSyncRepairService,
    IdentityUserEventPublisherService,
    {
      provide: 'IUserRepository',
      useClass: UserRepository
    }
  ]
})
export class PassengerSyncRepairModule {}
