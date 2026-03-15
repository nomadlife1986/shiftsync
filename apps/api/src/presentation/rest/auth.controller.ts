import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { LoginUseCase } from '../../application/auth/login.use-case';

@Controller('api/auth')
export class AuthController {
  constructor(private loginUseCase: LoginUseCase) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      return await this.loginUseCase.execute(body);
    } catch {
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
