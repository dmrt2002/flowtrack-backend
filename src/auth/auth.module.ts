import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailService } from './services/email.service';
import { RateLimitService } from './services/rate-limit.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HybridAuthGuard } from './guards/hybrid-auth.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m', // Access token expiry
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    EmailService,
    RateLimitService,
    LocalStrategy,
    JwtStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
    HybridAuthGuard,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
  exports: [
    AuthService,
    PasswordService,
    TokenService,
    EmailService,
    RateLimitService,
    JwtAuthGuard,
    LocalAuthGuard,
    HybridAuthGuard,
  ],
})
export class AuthModule {}
