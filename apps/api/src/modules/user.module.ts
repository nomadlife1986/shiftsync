import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '../domain/user/repositories/user.repository.interface';
import { PrismaUserRepository } from '../infrastructure/persistence/repositories/prisma-user.repository';
import { CreateUserUseCase } from '../application/user/create-user.use-case';
import { UpdateUserUseCase } from '../application/user/update-user.use-case';
import { SetAvailabilityUseCase } from '../application/user/set-availability.use-case';
import { UserResolver } from '../presentation/graphql/resolvers/user.resolver';
import { PASSWORD_HASHER } from '../application/common/interfaces';
import { BcryptPasswordHasher } from '../infrastructure/auth/password-hasher';

@Module({
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    CreateUserUseCase,
    UpdateUserUseCase,
    SetAvailabilityUseCase,
    UserResolver,
  ],
  exports: [USER_REPOSITORY, PASSWORD_HASHER],
})
export class UserModule {}
