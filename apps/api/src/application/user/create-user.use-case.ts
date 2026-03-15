import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { IUseCase } from '../common/use-case.interface';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/repositories/user.repository.interface';
import { IPasswordHasher, PASSWORD_HASHER } from '../common/interfaces';
import { UserEntity } from '../../domain/user/entities/user.entity';
import { randomUUID } from 'crypto';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  phone?: string;
  desiredWeeklyHours?: number;
  skills?: string[];
}

@Injectable()
export class CreateUserUseCase implements IUseCase<CreateUserInput, UserEntity> {
  constructor(
    @Inject(USER_REPOSITORY) private userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private hasher: IPasswordHasher,
  ) {}

  async execute(input: CreateUserInput): Promise<UserEntity> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await this.hasher.hash(input.password);
    const now = new Date();
    const user = UserEntity.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      phone: input.phone ?? null,
      desiredWeeklyHours: input.desiredWeeklyHours ?? null,
      skills: (input.skills ?? []).map(s => s.toLowerCase()),
      certifications: [],
      availabilities: [],
      managedLocationIds: [],
      createdAt: now,
      updatedAt: now,
    }, randomUUID());

    return this.userRepo.save(user);
  }
}
