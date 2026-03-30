import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { IUserRepository } from '@/data/repositories/user.repository';
import { encryptPassword } from 'building-blocks/utils/encryption';
import { User } from '@/user/entities/user.entity';
import { Role } from '@/user/enums/role.enum';
import { PassengerType } from '@/user/enums/passenger-type.enum';
import { UserDto } from '@/user/dtos/user.dto';
import mapper from '@/user/mapping';
import { IdentityUserEventPublisherService } from '@/user/services/identity-user-event-publisher.service';
import { DataSource } from 'typeorm';

type CreateIdentityUserInput = {
  email: string;
  password: string;
  name: string;
  role: Role;
  passportNumber: string;
  age: number;
  passengerType: PassengerType;
  isEmailVerified?: boolean;
};

type DuplicateDriverError = {
  code?: string;
  constraint?: string;
  detail?: string;
};

@Injectable()
export class IdentityUserWriteService {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    private readonly dataSource: DataSource,
    private readonly identityUserEventPublisherService: IdentityUserEventPublisherService
  ) {}

  async createUser(input: CreateIdentityUserInput): Promise<UserDto> {
    const existingUser = await this.userRepository.findUserByEmail(input.email);

    if (existingUser) {
      throw new ConflictException('Email already taken');
    }

    try {
      const encryptedPassword = await encryptPassword(input.password);
      const userEntity = await this.dataSource.transaction(async (manager) => {
        const createdUser = await manager.getRepository(User).save(
          new User({
            email: input.email,
            name: input.name,
            password: encryptedPassword,
            role: input.role,
            passportNumber: input.passportNumber,
            age: input.age,
            passengerType: input.passengerType,
            isEmailVerified: input.isEmailVerified ?? false
          })
        );

        await this.identityUserEventPublisherService.publishUserCreated(createdUser, manager);

        return createdUser;
      });

      return mapper.map<User, UserDto>(userEntity, new UserDto());
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException('Email already taken');
      }

      throw error;
    }
  }

  private isDuplicateEmailError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('driverError' in error)) {
      return false;
    }

    const driverError = (error as { driverError?: DuplicateDriverError }).driverError;

    if (driverError?.code !== '23505') {
      return false;
    }

    return driverError.constraint === 'UQ_user_email' || driverError.detail?.includes('(email)') === true;
  }
}
