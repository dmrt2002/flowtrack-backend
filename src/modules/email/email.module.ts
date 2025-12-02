import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { WorkflowEmailService } from './workflow-email.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { SentEmailService } from './services/sent-email.service';
import { EmailTrackingController } from './controllers/email-tracking.controller';
import { SentEmailController } from './controllers/sent-email.controller';
import { OAuthModule } from '../oauth/oauth.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    OAuthModule,
    PrismaModule,
    JwtModule.register({}),
  ],
  controllers: [EmailTrackingController, SentEmailController],
  providers: [WorkflowEmailService, EmailTrackingService, SentEmailService],
  exports: [WorkflowEmailService, EmailTrackingService, SentEmailService],
})
export class EmailModule {}
