import { UserEntity } from '../entities/user.entity';

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByIds(ids: string[]): Promise<UserEntity[]>;
  findStaffByLocationAndSkill(locationId: string, skill: string): Promise<UserEntity[]>;
  findAvailableStaff(locationId: string, skill: string, start: Date, end: Date): Promise<UserEntity[]>;
  findAll(filter?: { role?: string; locationId?: string }): Promise<UserEntity[]>;
  save(user: UserEntity): Promise<UserEntity>;
  delete(id: string): Promise<void>;
}

export const USER_REPOSITORY = 'IUserRepository';
