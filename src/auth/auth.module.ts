import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailService } from './services/email.service';
import { RateLimitService } from './services/rate-limit.service';
import { UnifiedAuthGuard } from './guards/unified-auth.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '6h', // Access token expiry (matches cookie maxAge)
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
    UnifiedAuthGuard,
    {
      provide: APP_GUARD,
      useClass: UnifiedAuthGuard,
    },
  ],
  exports: [
    AuthService,
    PasswordService,
    TokenService,
    EmailService,
    RateLimitService,
    UnifiedAuthGuard,
  ],
})
export class AuthModule {}
