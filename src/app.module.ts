import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { OAuthModule } from './modules/oauth/oauth.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { BookingModule } from './modules/booking/booking.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FormsModule } from './modules/forms/forms.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { LeadsModule } from './modules/leads/leads.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { UserModule } from './modules/user/user.module';
import { BillingModule } from './modules/billing/billing.module';
import { EmailRelayModule } from './modules/email-relay/email-relay.module';
import { MeetingRecorderModule } from './modules/meeting-recorder/meeting-recorder.module';
import { EnrichmentModule } from './modules/enrichment/enrichment.module';
import { OnboardingScraperModule } from './modules/onboarding-scraper/onboarding-scraper.module';
import { SalesPitchModule } from './modules/sales-pitch/sales-pitch.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // BullMQ (Redis-based queue)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
    }),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    WorkspaceModule,
    ProjectModule,
    TaskModule,
    OnboardingModule,
    OAuthModule,
    CalendarModule,
    BookingModule,
    DashboardModule,
    FormsModule,
    AnalyticsModule,
    LeadsModule,
    WorkflowsModule,
    UserModule,
    BillingModule,
    EmailRelayModule,
    MeetingRecorderModule,
    EnrichmentModule,
    OnboardingScraperModule,
    SalesPitchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
