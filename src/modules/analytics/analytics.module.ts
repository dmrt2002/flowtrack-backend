import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { WorkflowAnalyticsController } from './controllers/workflow-analytics.controller';
import { WorkflowAnalyticsService } from './services/workflow-analytics.service';
import { AnalyticsAggregationService } from './services/analytics-aggregation.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}), // Required for UnifiedAuthGuard
  ],
  controllers: [WorkflowAnalyticsController],
  providers: [WorkflowAnalyticsService, AnalyticsAggregationService],
  exports: [WorkflowAnalyticsService, AnalyticsAggregationService],
})
export class AnalyticsModule {}
