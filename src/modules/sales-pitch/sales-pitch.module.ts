/**
 * Sales Pitch Module
 *
 * Zero-cost AI-powered sales intelligence for leads
 * Combines user company data + lead enrichment via local Ollama LLM
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { SalesPitchController } from './sales-pitch.controller';
import { PitchConfigController } from './controllers/pitch-config.controller';
import { SalesPitchService } from './services/sales-pitch.service';
import { OllamaPitchService } from './services/ollama-pitch.service';
import { PitchQueueService } from './services/pitch-queue.service';
import { PitchProcessor } from './processors/pitch.processor';
import { PitchTemplateService } from './services/pitch-template.service';
import { PitchConfigService } from './services/pitch-config.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}), // Required for UnifiedAuthGuard
    PrismaModule,
    BullModule.registerQueue({
      name: 'pitch-generation',
    }),
  ],
  controllers: [SalesPitchController, PitchConfigController],
  providers: [
    PrismaService,
    SalesPitchService,
    OllamaPitchService,
    PitchQueueService,
    PitchProcessor,
    PitchTemplateService,
    PitchConfigService,
  ],
  exports: [SalesPitchService, PitchQueueService, PitchConfigService],
})
export class SalesPitchModule {}
