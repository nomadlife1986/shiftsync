import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/repositories/user.repository.interface';
import { UserEntity } from '../../domain/user/entities/user.entity';

export interface UpdateUserInput {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  desiredWeeklyHours?: number;
  skills?: string[];
  certifiedLocationIds?: string[];
  managedLocationIds?: string[];
}

@Injectable()
export class UpdateUserUseCase implements IUseCase<UpdateUserInput, UserEntity> {
  constructor(@Inject(USER_REPOSITORY) private userRepo: IUserRepository) {}

  async execute(input: UpdateUserInput): Promise<UserEntity> {
    const user = await this.userRepo.findById(input.id);
    if (!user) throw new NotFoundException('User not found');
    user.updateProfile({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      desiredWeeklyHours: input.desiredWeeklyHours ?? null,
    });
    if (input.skills !== undefined) {
      // Reset skills and re-add (normalise to lowercase to match DB convention)
      (user as any).props.skills = input.skills.map((s: string) => s.toLowerCase());
    }
    if (input.certifiedLocationIds !== undefined && user.isStaff()) {
      user.syncCertifications(input.certifiedLocationIds);
    }
    if (input.managedLocationIds !== undefined && user.isManager()) {
      user.setManagedLocations(input.managedLocationIds);
    }
    return this.userRepo.save(user);
  }
}
