import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { MessageService } from './services/message.service';
import { RelayEmailService } from './services/relay-email.service';
import { ImapPollerService } from './services/imap-poller.service';
import { EmailPollQueueService } from './services/email-poll-queue.service';
import { EmailPollProcessor } from './processors/email-poll.processor';
import { MessageController } from './controllers/message.controller';
import { HotboxController } from './controllers/hotbox.controller';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.register({}), // Required for UnifiedAuthGuard
    BullModule.registerQueue({
      name: 'email-relay-poll',
    }),
  ],
  controllers: [MessageController, HotboxController],
  providers: [
    MessageService,
    RelayEmailService,
    ImapPollerService,
    EmailPollQueueService,
    EmailPollProcessor,
  ],
  exports: [RelayEmailService, MessageService],
})
export class EmailRelayModule {}
