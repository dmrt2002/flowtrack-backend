import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { TokenManagerService } from './services/token-manager.service';
import { WebhookVerifierService } from './services/webhook-verifier.service';
import { AttributionMatcherService } from './services/attribution-matcher.service';
import { CalendlyService } from './services/calendly.service';
import { PollingService } from './services/polling.service';
import { PollingQueueService } from './services/polling-queue.service';
import { CalendarLinkGeneratorService } from './services/calendar-link-generator.service';
import { OAuthStateManagerService } from './services/oauth-state-manager.service';
import { CalendlyController } from './controllers/calendly.controller';
import { BookingHealthController } from './controllers/booking-health.controller';
import { PollingProcessor } from './processors/polling.processor';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [
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
    BullModule.registerQueue({
      name: 'booking-polling',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [CalendlyController, BookingHealthController],
  providers: [
    TokenManagerService,
    WebhookVerifierService,
    AttributionMatcherService,
    CalendlyService,
    PollingService,
    PollingQueueService,
    CalendarLinkGeneratorService,
    OAuthStateManagerService,
    PollingProcessor,
    PrismaService,
  ],
  exports: [
    TokenManagerService,
    WebhookVerifierService,
    AttributionMatcherService,
    CalendlyService,
    PollingService,
    PollingQueueService,
    CalendarLinkGeneratorService,
    OAuthStateManagerService,
  ],
})
export class BookingModule {}
