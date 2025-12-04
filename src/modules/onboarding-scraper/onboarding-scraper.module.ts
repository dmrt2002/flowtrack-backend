/**
 * Onboarding Scraper Module
 *
 * NestJS module for company website scraping and business intelligence extraction
 * during the onboarding flow.
 */

import { Module } from '@nestjs/common';
import { OnboardingScraperController } from './onboarding-scraper.controller';
import { OnboardingScraperService } from './services/onboarding-scraper.service';
import { DomainResolverService } from './services/domain-resolver.service';
import { BusinessIntelligenceService } from './services/business-intelligence.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OnboardingScraperController],
  providers: [
    OnboardingScraperService,
    DomainResolverService,
    BusinessIntelligenceService,
  ],
  exports: [OnboardingScraperService], // Export for use in other modules
})
export class OnboardingScraperModule {}
