import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/gql-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { UserType } from '../types/user.type';
import { CreateUserInput, UpdateUserInput, SetAvailabilityInput } from '../inputs/create-shift.input';
import { CreateUserUseCase } from '../../../application/user/create-user.use-case';
import { UpdateUserUseCase } from '../../../application/user/update-user.use-case';
import { SetAvailabilityUseCase } from '../../../application/user/set-availability.use-case';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/user/repositories/user.repository.interface';

@Resolver(() => UserType)
@UseGuards(JwtAuthGuard)
export class UserResolver {
  constructor(
    private createUserUc: CreateUserUseCase,
    private updateUserUc: UpdateUserUseCase,
    private setAvailabilityUc: SetAvailabilityUseCase,
    @Inject(USER_REPOSITORY) private userRepo: IUserRepository,
  ) {}

  @Query(() => UserType)
  async me(@CurrentUser() user: { id: string }): Promise<UserType> {
    const u = await this.userRepo.findById(user.id);
    if (!u) throw new Error('User not found');
    return this.toType(u);
  }

  @Query(() => [UserType])
  async users(
    @Args('role', { nullable: true }) role?: string,
    @Args('locationId', { type: () => ID, nullable: true }) locationId?: string,
  ): Promise<UserType[]> {
    const users = await this.userRepo.findAll({ role, locationId });
    return users.map(u => this.toType(u));
  }

  @Query(() => UserType)
  async user(@Args('id', { type: () => ID }) id: string): Promise<UserType> {
    const u = await this.userRepo.findById(id);
    if (!u) throw new Error('User not found');
    return this.toType(u);
  }

  @Query(() => [UserType])
  async staffByLocation(@Args('locationId', { type: () => ID }) locationId: string): Promise<UserType[]> {
    const users = await this.userRepo.findAll({ role: 'STAFF', locationId });
    return users.map(u => this.toType(u));
  }

  @Mutation(() => UserType)
  async createUser(@Args('input') input: CreateUserInput): Promise<UserType> {
    const user = await this.createUserUc.execute({ ...input, role: input.role as any });
    return this.toType(user);
  }

  @Mutation(() => UserType)
  async updateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateUserInput,
  ): Promise<UserType> {
    const user = await this.updateUserUc.execute({ id, ...input });
    return this.toType(user);
  }

  @Mutation(() => UserType)
  async setAvailability(
    @Args('userId', { type: () => ID, nullable: true }) userId: string | undefined,
    @Args('input') input: SetAvailabilityInput,
    @CurrentUser() currentUser: { id: string },
  ): Promise<UserType> {
    const targetId = userId ?? currentUser.id;
    const user = await this.setAvailabilityUc.execute({ userId: targetId, availability: input.availability });
    return this.toType(user);
  }

  private toType(u: any): UserType {
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      phone: u.phone ?? undefined,
      desiredWeeklyHours: u.desiredWeeklyHours ?? undefined,
      skills: u.skills ?? [],
      availability: u.availabilities ?? [],
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }
}
