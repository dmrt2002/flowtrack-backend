import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorkflowEmailService } from './workflow-email.service';
import { OAuthModule } from '../oauth/oauth.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ConfigModule, OAuthModule, PrismaModule],
  providers: [WorkflowEmailService],
  exports: [WorkflowEmailService],
})
export class EmailModule {}
