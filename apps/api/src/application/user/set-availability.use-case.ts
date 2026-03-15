import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/repositories/user.repository.interface';
import { UserEntity } from '../../domain/user/entities/user.entity';

export interface AvailabilityInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate?: Date;
  isAvailable: boolean;
}

export interface SetAvailabilityInput {
  userId: string;
  availability: AvailabilityInput[];
}

@Injectable()
export class SetAvailabilityUseCase implements IUseCase<SetAvailabilityInput, UserEntity> {
  constructor(@Inject(USER_REPOSITORY) private userRepo: IUserRepository) {}

  async execute(input: SetAvailabilityInput): Promise<UserEntity> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) throw new NotFoundException('User not found');
    user.setAvailability(
      input.availability.map(a => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isRecurring: a.isRecurring,
        specificDate: a.specificDate ?? null,
        isAvailable: a.isAvailable,
      })),
    );
    return this.userRepo.save(user);
  }
}
