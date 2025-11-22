import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './services/onboarding.service';
import { StrategyTemplateService } from './services/strategy-template.service';
import { ConfigurationService } from './services/configuration.service';
import { SimulationService } from './services/simulation.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '6h',
        },
      }),
    }),
  ],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    StrategyTemplateService,
    ConfigurationService,
    SimulationService,
  ],
  exports: [OnboardingService],
})
export class OnboardingModule {}
