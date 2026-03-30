import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '@/data/repositories/user.repository';
import { IdentityUserEventPublisherService } from '@/user/services/identity-user-event-publisher.service';
import { User } from '@/user/entities/user.entity';

type RepairPassengerSyncInput = {
  userId?: number;
  all?: boolean;
};

export type RepairPassengerSyncResult = {
  mode: 'single' | 'all';
  userIds: number[];
  publishedCount: number;
};

@Injectable()
export class PassengerSyncRepairService {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    private readonly identityUserEventPublisherService: IdentityUserEventPublisherService
  ) {}

  async repair(input: RepairPassengerSyncInput): Promise<RepairPassengerSyncResult> {
    const users = await this.resolveUsers(input);

    for (const user of users) {
      await this.identityUserEventPublisherService.publishUserCreated(user);
      Logger.log(`Republished sanitized UserCreated event for user ${user.id}.`);
    }

    return {
      mode: input.all ? 'all' : 'single',
      userIds: users.map((user) => user.id),
      publishedCount: users.length
    };
  }

  private async resolveUsers(input: RepairPassengerSyncInput): Promise<User[]> {
    if (input.all) {
      return await this.userRepository.getAllUsers();
    }

    const userId = Number(input.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('Provide either --all or a positive --userId=<id>.');
    }

    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return [user];
  }
}
