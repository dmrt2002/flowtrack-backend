import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { WorkflowEmailService } from './workflow-email.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { EmailTrackingController } from './controllers/email-tracking.controller';
import { OAuthModule } from '../oauth/oauth.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    OAuthModule,
    PrismaModule,
    JwtModule.register({}),
  ],
  controllers: [EmailTrackingController],
  providers: [WorkflowEmailService, EmailTrackingService],
  exports: [WorkflowEmailService, EmailTrackingService],
})
export class EmailModule {}
