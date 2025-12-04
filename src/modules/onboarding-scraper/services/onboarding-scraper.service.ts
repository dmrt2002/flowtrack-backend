/**
 * Onboarding Scraper Service
 *
 * Main orchestration service for website scraping and business intelligence extraction.
 * Coordinates domain resolution, web scraping, and classification services.
 *
 * Architecture: First-principles web scraping using axios + cheerio (no browser automation)
 */

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaService } from '../../../prisma/prisma.service';
import { DomainResolverService } from './domain-resolver.service';
import { BusinessIntelligenceService } from './business-intelligence.service';
import {
  ScraperRequest,
  ScraperResponse,
  EnrichedCompanyData,
  WebsiteMetadata,
  DEFAULT_SCRAPING_CONFIG,
  CONFIDENCE_THRESHOLDS,
} from '../types/scraper.types';

@Injectable()
export class OnboardingScraperService {
  private readonly logger = new Logger(OnboardingScraperService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainResolver: DomainResolverService,
    private readonly businessIntel: BusinessIntelligenceService,
  ) {}

  /**
   * Main entry point: Scrape and analyze company website
   */
  async scrapeCompany(request: ScraperRequest): Promise<ScraperResponse> {
    try {
      this.logger.log(`Starting scrape for workflow: ${request.workflowId}`);

      // Step 1: Resolve domain
      const domain = await this.resolveDomain(request);
      if (!domain) {
        return {
          success: false,
          error: {
            code: 'DOMAIN_NOT_FOUND',
            message: 'Could not find a valid website for this company',
            details: {
              companyName: request.companyName,
              providedWebsite: request.website,
            },
          },
        };
      }

      this.logger.log(`Resolved domain: ${domain}`);

      // Step 2: Scrape website
      const scrapedData = await this.scrapeWebsite(domain);
      if (!scrapedData) {
        return {
          success: false,
          error: {
            code: 'SCRAPING_FAILED',
            message: 'Failed to scrape website content',
            details: { domain },
          },
        };
      }

      // Step 3: Extract metadata
      const $ = cheerio.load(scrapedData.html);
      const metadata = this.extractMetadata($, domain);

      // Step 4: Classify business
      const businessModel = this.businessIntel.detectBusinessModel($, metadata);
      const industry = this.businessIntel.detectIndustry($, metadata);
      const companySize = this.businessIntel.detectCompanySize($, metadata);

      // Step 5: Generate summary
      const summary = this.businessIntel.generateBusinessSummary(
        businessModel.model,
        industry.industry,
        metadata,
        $,
      );

      // Step 6: Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(
        businessModel.confidence,
        industry.confidence,
        companySize.confidence,
        metadata,
      );

      // Step 7: Get company logo
      const logo = await this.getCompanyLogo(domain);

      // Step 8: Build enriched data
      const enrichedData: EnrichedCompanyData = {
        summary,
        industry: industry.industry,
        businessModel: businessModel.model,
        companySize: companySize.size,
        website: domain,
        companyName: metadata.jsonLd?.name || metadata.ogTitle || metadata.title || request.companyName || '',
        logo,
        confidence: overallConfidence,
        scrapedAt: new Date(),
        source: request.website ? 'user_provided' : 'inferred',
        structuredData: metadata,
      };

      // Step 9: Store in database
      await this.storeEnrichedData(request.workflowId, enrichedData);

      this.logger.log(`Successfully enriched company data for workflow: ${request.workflowId}`);

      return {
        success: true,
        data: enrichedData,
      };
    } catch (error) {
      this.logger.error(`Scraping failed: ${error.message}`, error.stack);

      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred during scraping',
          details: { error: error.message },
        },
      };
    }
  }

  /**
   * Resolve domain from company name or user-provided URL
   */
  private async resolveDomain(request: ScraperRequest): Promise<string | null> {
    // If user provided website, parse and validate it
    if (request.website) {
      const parsed = this.domainResolver.parseUserProvidedUrl(request.website);
      if (parsed) {
        return parsed;
      }
    }

    // Otherwise, infer from company name
    if (request.companyName) {
      const result = await this.domainResolver.inferDomain(request.companyName);
      return result.domain;
    }

    return null;
  }

  /**
   * Scrape website HTML content
   */
  private async scrapeWebsite(
    domain: string,
  ): Promise<{ html: string; status: number } | null> {
    try {
      // Try HTTPS first
      try {
        const response = await axios.get(`https://${domain}`, {
          timeout: DEFAULT_SCRAPING_CONFIG.timeout,
          maxRedirects: 5,
          headers: {
            'User-Agent': DEFAULT_SCRAPING_CONFIG.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
          },
          validateStatus: (status) => status < 500,
        });

        if (response.status >= 200 && response.status < 400) {
          return {
            html: response.data,
            status: response.status,
          };
        }
      } catch (httpsError) {
        this.logger.warn(`HTTPS failed for ${domain}, trying HTTP: ${httpsError.message}`);
      }

      // Fallback to HTTP
      const response = await axios.get(`http://${domain}`, {
        timeout: DEFAULT_SCRAPING_CONFIG.timeout,
        maxRedirects: 5,
        headers: {
          'User-Agent': DEFAULT_SCRAPING_CONFIG.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        validateStatus: (status) => status < 500,
      });

      if (response.status >= 200 && response.status < 400) {
        return {
          html: response.data,
          status: response.status,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to scrape ${domain}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract metadata from HTML
   */
  private extractMetadata(
    $: cheerio.CheerioAPI,
    domain: string,
  ): WebsiteMetadata {
    const metadata: WebsiteMetadata = {};

    // Basic meta tags
    metadata.title = $('title').text().trim();
    metadata.description = $('meta[name="description"]').attr('content')?.trim();

    // Open Graph tags
    metadata.ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
    metadata.ogDescription = $('meta[property="og:description"]').attr('content')?.trim();
    metadata.ogImage = $('meta[property="og:image"]').attr('content')?.trim();

    // JSON-LD structured data
    try {
      const jsonLdScript = $('script[type="application/ld+json"]').first().html();
      if (jsonLdScript) {
        const jsonLd = JSON.parse(jsonLdScript);
        metadata.jsonLd = jsonLd;
      }
    } catch (error) {
      // JSON-LD parsing failed, continue without it
    }

    // Social media links
    metadata.socialLinks = {
      linkedin: this.extractSocialLink($, 'linkedin.com'),
      twitter: this.extractSocialLink($, 'twitter.com') || this.extractSocialLink($, 'x.com'),
      facebook: this.extractSocialLink($, 'facebook.com'),
    };

    // Tech stack detection (reuse from enrichment module patterns)
    metadata.techStack = this.detectBasicTechStack($, domain);

    return metadata;
  }

  /**
   * Extract social media link
   */
  private extractSocialLink($: cheerio.CheerioAPI, platform: string): string | undefined {
    const link = $(`a[href*="${platform}"]`).first().attr('href');
    if (link) {
      // Clean URL (remove query parameters)
      try {
        const url = new URL(link);
        return `${url.protocol}//${url.host}${url.pathname}`;
      } catch {
        return link;
      }
    }
    return undefined;
  }

  /**
   * Basic tech stack detection (simplified version)
   */
  private detectBasicTechStack($: cheerio.CheerioAPI, domain: string): string[] {
    const detected: string[] = [];

    const html = $.html();

    // Analytics
    if (html.includes('google-analytics.com') || html.includes('gtag')) {
      detected.push('Google Analytics');
    }

    // Chat widgets
    if (html.includes('intercom')) detected.push('Intercom');
    if (html.includes('drift')) detected.push('Drift');
    if (html.includes('zendesk')) detected.push('Zendesk');

    // Marketing
    if (html.includes('hubspot')) detected.push('HubSpot');
    if (html.includes('marketo')) detected.push('Marketo');

    // Payment
    if (html.includes('stripe')) detected.push('Stripe');
    if (html.includes('paypal')) detected.push('PayPal');

    // CMS
    if (html.includes('wp-content') || html.includes('wordpress')) {
      detected.push('WordPress');
    }
    if (html.includes('shopify')) detected.push('Shopify');

    // Frameworks
    if (html.includes('_next')) detected.push('Next.js');
    if (html.includes('__nuxt')) detected.push('Nuxt.js');
    if (html.includes('react')) detected.push('React');

    return detected;
  }

  /**
   * Get company logo (via Clearbit free API)
   */
  private async getCompanyLogo(domain: string): Promise<string | undefined> {
    try {
      const logoUrl = `https://logo.clearbit.com/${domain}`;

      // Verify logo exists
      const response = await axios.head(logoUrl, {
        timeout: 3000,
        validateStatus: (status) => status === 200,
      });

      if (response.status === 200) {
        return logoUrl;
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    businessModelConf: number,
    industryConf: number,
    companySizeConf: number,
    metadata: WebsiteMetadata,
  ): number {
    // Weighted average
    let confidence =
      businessModelConf * 0.4 +
      industryConf * 0.4 +
      companySizeConf * 0.2;

    // Boost if we have high-quality metadata
    if (metadata.jsonLd) {
      confidence += 0.05;
    }

    if (metadata.description && metadata.description.length > 100) {
      confidence += 0.05;
    }

    // Cap at 0.95 (never 100% confident)
    return Math.min(Math.round(confidence * 100) / 100, 0.95);
  }

  /**
   * Store enriched data in OnboardingSession
   */
  private async storeEnrichedData(
    workflowId: string,
    enrichedData: EnrichedCompanyData,
  ): Promise<void> {
    try {
      // Get workflow and workspace to find user
      const workflow = await this.prisma.workflow.findUnique({
        where: { id: workflowId },
        select: { workspaceId: true },
      });

      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      const workspaceId = workflow.workspaceId;

      // Get workspace to find userId
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerUserId: true },
      });

      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }

      const userId = workspace.ownerUserId;

      // Find or create onboarding session
      let session = await this.prisma.onboardingSession.findFirst({
        where: {
          workspaceId,
          userId,
          isComplete: false,
        },
      });

      if (!session) {
        // Create new session
        session = await this.prisma.onboardingSession.create({
          data: {
            workspaceId,
            userId,
            currentStep: 2, // Enrichment is step 2
            completedSteps: [1], // Form builder completed
            selectedStrategyId: 'unified',
            configurationData: JSON.parse(JSON.stringify({
              enrichedCompany: enrichedData,
            })) as any,
            isComplete: false,
          },
        });
      } else {
        // Update existing session
        const existingConfig = (session.configurationData as any) || {};

        await this.prisma.onboardingSession.update({
          where: { id: session.id },
          data: {
            configurationData: JSON.parse(JSON.stringify({
              ...existingConfig,
              enrichedCompany: enrichedData,
            })) as any,
          },
        });
      }

      this.logger.log(`Stored enriched data in onboarding session: ${session.id}`);
    } catch (error) {
      this.logger.error(`Failed to store enriched data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get enriched data from OnboardingSession
   */
  async getEnrichedData(workflowId: string): Promise<EnrichedCompanyData | null> {
    try {
      const workflow = await this.prisma.workflow.findUnique({
        where: { id: workflowId },
        select: { workspaceId: true },
      });

      if (!workflow) {
        return null;
      }

      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workflow.workspaceId },
        select: { ownerUserId: true },
      });

      if (!workspace) {
        return null;
      }

      const session = await this.prisma.onboardingSession.findFirst({
        where: {
          workspaceId: workflow.workspaceId,
          userId: workspace.ownerUserId,
          isComplete: false,
        },
      });

      if (!session || !session.configurationData) {
        return null;
      }

      const config = session.configurationData as any;
      return config.enrichedCompany || null;
    } catch (error) {
      this.logger.error(`Failed to get enriched data: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if enrichment is already completed
   */
  async isEnrichmentComplete(workflowId: string): Promise<boolean> {
    const data = await this.getEnrichedData(workflowId);
    return data !== null;
  }
}
