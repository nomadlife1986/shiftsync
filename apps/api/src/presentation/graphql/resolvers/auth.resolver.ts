import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { ObjectType, Field } from '@nestjs/graphql';
import { LoginUseCase } from '../../../application/auth/login.use-case';

@ObjectType()
class LoginResult {
  @Field() accessToken!: string;
  @Field() userId!: string;
  @Field() role!: string;
  @Field() email!: string;
  @Field() firstName!: string;
  @Field() lastName!: string;
}

@Resolver()
export class AuthResolver {
  constructor(private loginUseCase: LoginUseCase) {}

  @Mutation(() => LoginResult)
  async login(
    @Args('email') email: string,
    @Args('password') password: string,
  ): Promise<LoginResult> {
    const result = await this.loginUseCase.execute({ email, password });
    return {
      accessToken: result.accessToken,
      userId: result.user.id,
      role: result.user.role,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
    };
  }
}
