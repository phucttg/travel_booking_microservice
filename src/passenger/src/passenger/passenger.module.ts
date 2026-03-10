import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IPassengerRepository, PassengerRepository } from '@/data/repositories/passenger.repository';
import { Passenger } from '@/passenger/entities/passenger.entity';
import { RabbitmqModule } from 'building-blocks/rabbitmq/rabbitmq.module';
import {
  GetPassengerByIdController,
  GetPassengerByIdHandler
} from '@/passenger/features/v1/get-passenger-by-id/get-passenger-by-id';
import {
  GetPassengersController,
  GetPassengersHandler
} from '@/passenger/features/v1/get-passengers/get-passengers';
import {
  GetPassengerByUserIdController,
  GetPassengerByUserIdHandler
} from '@/passenger/features/v1/get-passenger-by-user-id/get-passenger-by-user-id';
import { UserCreated, UserUpdated } from 'building-blocks/contracts/identity.contract';
import { CreateUserConsumerHandler } from '@/user/consumers/create-user';
import { IRabbitmqConsumer } from 'building-blocks/rabbitmq/rabbitmq-subscriber';
import { UpdateUserConsumerHandler } from '@/user/consumers/update-user';

@Module({
  imports: [CqrsModule, RabbitmqModule.forRoot(), TypeOrmModule.forFeature([Passenger])],
  controllers: [GetPassengerByIdController, GetPassengerByUserIdController, GetPassengersController],
  providers: [
    GetPassengerByIdHandler,
    GetPassengerByUserIdHandler,
    GetPassengersHandler,
    CreateUserConsumerHandler,
    UpdateUserConsumerHandler,
    {
      provide: 'IPassengerRepository',
      useClass: PassengerRepository
    }
  ],
  exports: []
})
export class PassengerModule implements OnApplicationBootstrap {
  constructor(
    @Inject('IRabbitmqConsumer') private readonly rabbitmqConsumer: IRabbitmqConsumer,
    private readonly createUserConsumerHandler: CreateUserConsumerHandler,
    private readonly updateUserConsumerHandler: UpdateUserConsumerHandler
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.rabbitmqConsumer.consumeMessage(
      UserCreated,
      this.createUserConsumerHandler.handle.bind(this.createUserConsumerHandler)
    );
    await this.rabbitmqConsumer.consumeMessage(
      UserUpdated,
      this.updateUserConsumerHandler.handle.bind(this.updateUserConsumerHandler)
    );
  }
}
