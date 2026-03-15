import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../infrastructure/auth/jwt.strategy';
import { JwtAuthGuard } from '../infrastructure/auth/jwt-auth.guard';
import { LoginUseCase } from '../application/auth/login.use-case';
import { AuthResolver } from '../presentation/graphql/resolvers/auth.resolver';
import { AuthController } from '../presentation/rest/auth.controller';
import { UserModule } from './user.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'shiftsync-secret-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
    UserModule,
  ],
  providers: [JwtStrategy, JwtAuthGuard, LoginUseCase, AuthResolver],
  controllers: [AuthController],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
