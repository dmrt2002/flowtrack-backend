import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { WorkflowEmailService } from './workflow-email.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { SentEmailService } from './services/sent-email.service';
import { DnsResolverService } from './services/dns-resolver.service';
import { TrackingClassifierService } from './services/tracking-classifier.service';
import { EmailTrackingController } from './controllers/email-tracking.controller';
import { SentEmailController } from './controllers/sent-email.controller';
import { EmailTrackingAnalysisProcessor } from './processors/email-tracking-analysis.processor';
import { OAuthModule } from '../oauth/oauth.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    OAuthModule,
    PrismaModule,
    JwtModule.register({}),
    BullModule.registerQueue({
      name: 'email-tracking-analysis',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [EmailTrackingController, SentEmailController],
  providers: [
    WorkflowEmailService,
    EmailTrackingService,
    SentEmailService,
    DnsResolverService,
    TrackingClassifierService,
    EmailTrackingAnalysisProcessor,
  ],
  exports: [WorkflowEmailService, EmailTrackingService, SentEmailService],
})
export class EmailModule {}
