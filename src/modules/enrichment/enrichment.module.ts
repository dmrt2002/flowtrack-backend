import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EnrichmentService } from './services/enrichment.service';
import { EnrichmentQueueService } from './services/enrichment-queue.service';
import { EnrichmentProcessor } from './processors/enrichment.processor';
import { EnrichmentController } from './enrichment.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'lead-enrichment',
    }),
  ],
  controllers: [EnrichmentController],
  providers: [
    EnrichmentService,
    EnrichmentQueueService,
    EnrichmentProcessor,
  ],
  exports: [EnrichmentService, EnrichmentQueueService],
})
export class EnrichmentModule {}
