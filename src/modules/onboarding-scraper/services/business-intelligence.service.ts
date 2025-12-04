/**
 * Business Intelligence Service
 *
 * Classifies businesses using pattern-matching and heuristic analysis:
 * - Business Model (B2B, B2C, B2B2C, Marketplace)
 * - Industry Vertical (Technology, Finance, Healthcare, etc.)
 * - Company Size (Startup, SMB, Mid-Market, Enterprise)
 * - Business Summary Generation
 *
 * Architecture: Pure rule-based classification (no LLM), high-performance
 */

import { Injectable, Logger } from '@nestjs/common';
import type { CheerioAPI } from 'cheerio';
import {
  BusinessModel,
  CompanySize,
  Industry,
  BusinessClassificationSignals,
  SummaryTemplate,
  WebsiteMetadata,
} from '../types/scraper.types';

@Injectable()
export class BusinessIntelligenceService {
  private readonly logger = new Logger(BusinessIntelligenceService.name);

  /**
   * Detect business model from website content
   */
  detectBusinessModel(
    $: CheerioAPI,
    metadata: WebsiteMetadata,
  ): { model: BusinessModel; confidence: number } {
    const signals = this.extractBusinessModelSignals($, metadata);

    // Calculate scores for each model
    const b2bScore = this.calculateB2BScore(signals);
    const b2cScore = this.calculateB2CScore(signals);
    const marketplaceScore = this.calculateMarketplaceScore(signals);

    this.logger.debug(`Business model scores - B2B: ${b2bScore}, B2C: ${b2cScore}, Marketplace: ${marketplaceScore}`);

    // Determine model based on highest score
    if (marketplaceScore > 60) {
      return { model: 'Marketplace', confidence: marketplaceScore / 100 };
    }

    if (b2bScore > b2cScore * 1.5) {
      return { model: 'B2B', confidence: Math.min(b2bScore / 100, 0.95) };
    }

    if (b2cScore > b2bScore * 1.5) {
      return { model: 'B2C', confidence: Math.min(b2cScore / 100, 0.95) };
    }

    // Mixed signals
    if (b2bScore > 40 && b2cScore > 40) {
      return { model: 'B2B2C', confidence: 0.7 };
    }

    // Default to B2B for low confidence
    return { model: 'B2B', confidence: 0.5 };
  }

  /**
   * Detect industry vertical from website content
   */
  detectIndustry(
    $: CheerioAPI,
    metadata: WebsiteMetadata,
  ): { industry: Industry; confidence: number } {
    const content = this.extractTextContent($);
    const keywords = metadata.description || '';
    const title = metadata.title || '';
    const allText = `${title} ${keywords} ${content}`.toLowerCase();

    // Industry classification rules
    const industries: Record<Industry, string[]> = {
      'Technology': ['software', 'saas', 'platform', 'api', 'cloud', 'tech', 'digital', 'app', 'application'],
      'SaaS': ['saas', 'subscription', 'cloud software', 'web app', 'platform as a service'],
      'E-commerce': ['shop', 'store', 'ecommerce', 'e-commerce', 'marketplace', 'buy online', 'shopping'],
      'Finance': ['finance', 'fintech', 'banking', 'payment', 'financial', 'lending', 'insurance', 'investment'],
      'Healthcare': ['health', 'healthcare', 'medical', 'hospital', 'clinic', 'patient', 'doctor', 'pharma'],
      'Education': ['education', 'learning', 'course', 'training', 'school', 'university', 'student', 'teach'],
      'Real Estate': ['real estate', 'property', 'housing', 'realty', 'mortgage', 'apartment', 'commercial property'],
      'Construction': ['construction', 'contractor', 'building', 'project management', 'architecture', 'engineering'],
      'Manufacturing': ['manufacturing', 'factory', 'production', 'industrial', 'supply chain', 'assembly'],
      'Retail': ['retail', 'wholesale', 'merchandise', 'brick and mortar', 'stores'],
      'Professional Services': ['consulting', 'advisory', 'professional services', 'agency', 'firm', 'law', 'accounting'],
      'Marketing & Advertising': ['marketing', 'advertising', 'agency', 'branding', 'creative', 'media', 'campaign'],
      'Hospitality': ['hotel', 'hospitality', 'restaurant', 'travel', 'tourism', 'accommodation'],
      'Nonprofit': ['nonprofit', 'non-profit', 'charity', 'foundation', 'ngo', 'organization', 'mission'],
      'Other': [],
    };

    // Score each industry
    const scores: Record<Industry, number> = {} as any;
    let maxScore = 0;
    let detectedIndustry: Industry = 'Other';

    for (const [industry, terms] of Object.entries(industries)) {
      let score = 0;
      for (const term of terms) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = allText.match(regex);
        if (matches) {
          score += matches.length * 10; // 10 points per match
        }
      }

      scores[industry as Industry] = score;

      if (score > maxScore) {
        maxScore = score;
        detectedIndustry = industry as Industry;
      }
    }

    // Calculate confidence based on score strength
    const confidence = Math.min(maxScore / 50, 0.95); // Cap at 0.95

    // Special case: If "SaaS" detected, use it instead of generic "Technology"
    if (detectedIndustry === 'Technology' && scores['SaaS'] > 20) {
      detectedIndustry = 'SaaS';
    }

    this.logger.debug(`Industry detection: ${detectedIndustry} (confidence: ${confidence})`);

    return { industry: detectedIndustry, confidence };
  }

  /**
   * Detect company size from website signals
   */
  detectCompanySize(
    $: CheerioAPI,
    metadata: WebsiteMetadata,
  ): { size: CompanySize; confidence: number } {
    const signals = this.extractCompanySizeSignals($, metadata);

    // Check JSON-LD for employee count
    if (metadata.jsonLd?.numberOfEmployees) {
      const count = parseInt(String(metadata.jsonLd.numberOfEmployees), 10);
      if (!isNaN(count)) {
        if (count < 50) return { size: 'Startup', confidence: 0.9 };
        if (count < 500) return { size: 'SMB', confidence: 0.9 };
        if (count < 2000) return { size: 'Mid-Market', confidence: 0.9 };
        return { size: 'Enterprise', confidence: 0.9 };
      }
    }

    // Heuristic-based detection
    const content = this.extractTextContent($).toLowerCase();

    const enterpriseIndicators = [
      'fortune 500',
      'global leader',
      'worldwide',
      '10,000+ employees',
      'enterprise solutions',
      'international offices',
    ];

    const startupIndicators = [
      'startup',
      'founded 20',
      'seed funded',
      'series a',
      'series b',
      'early stage',
      'small team',
    ];

    let enterpriseScore = 0;
    let startupScore = 0;

    for (const indicator of enterpriseIndicators) {
      if (content.includes(indicator)) enterpriseScore += 20;
    }

    for (const indicator of startupIndicators) {
      if (content.includes(indicator)) startupScore += 20;
    }

    // Determine size
    if (enterpriseScore > 40) {
      return { size: 'Enterprise', confidence: 0.75 };
    }

    if (startupScore > 40) {
      return { size: 'Startup', confidence: 0.75 };
    }

    // Default to SMB (most common)
    return { size: 'SMB', confidence: 0.6 };
  }

  /**
   * Generate business summary from classified data
   */
  generateBusinessSummary(
    businessModel: BusinessModel,
    industry: Industry,
    metadata: WebsiteMetadata,
    $: CheerioAPI,
  ): string {
    // Extract description from multiple sources
    const description =
      metadata.ogDescription ||
      metadata.description ||
      metadata.jsonLd?.description ||
      this.extractMainHeading($) ||
      'company';

    // Clean and truncate description
    const cleanDescription = this.cleanDescription(description);

    // Template-based summary generation
    const template = this.buildSummaryTemplate(businessModel, industry, cleanDescription);

    return template;
  }

  /**
   * Extract business model signals
   */
  private extractBusinessModelSignals(
    $: CheerioAPI,
    metadata: WebsiteMetadata,
  ): BusinessClassificationSignals {
    const content = this.extractTextContent($).toLowerCase();
    const links = $('a[href]').map((_, el) => $(el).attr('href') || '').get().join(' ').toLowerCase();

    return {
      // B2B indicators
      hasEnterpriseTerms: this.containsAny(content, [
        'enterprise',
        'business',
        'teams',
        'organizations',
        'b2b',
        'workflow',
        'productivity',
        'collaboration',
      ]),
      hasAPIDocumentation: this.containsAny(content + links, [
        '/api',
        '/docs',
        '/developers',
        'api documentation',
        'rest api',
        'graphql',
      ]),
      hasTeamsPricing: this.containsAny(content, [
        'teams pricing',
        'business plan',
        'enterprise pricing',
        'volume discounts',
        'seats',
      ]),
      hasIntegrations: this.containsAny(content + links, [
        'integrations',
        'zapier',
        'webhooks',
        'third-party',
        'connect with',
      ]),

      // B2C indicators
      hasShoppingCart: this.containsAny(content + links, [
        'add to cart',
        'shopping cart',
        'checkout',
        '/cart',
        'basket',
      ]),
      hasConsumerPricing: this.containsAny(content, [
        '$',
        'price',
        'buy now',
        'purchase',
        'shop now',
        'add to bag',
      ]),
      hasCheckoutFlow: links.includes('/checkout') || links.includes('/cart'),

      // Industry signals
      detectedKeywords: this.extractKeywords($, metadata),
      primaryVertical: this.detectIndustry($, metadata).industry,

      // Company size signals
      employeeCount: this.extractEmployeeCount(metadata),
      foundingYear: this.extractFoundingYear(content),
      hasCareersPage: links.includes('/careers') || links.includes('/jobs'),
      hasMultipleOffices: content.includes('offices') && content.includes('locations'),

      // Confidence factors
      hasStructuredData: !!metadata.jsonLd,
      metaQuality: this.assessMetaQuality(metadata),
      contentDepth: content.length,
    };
  }

  /**
   * Calculate B2B score (0-100)
   */
  private calculateB2BScore(signals: BusinessClassificationSignals): number {
    let score = 0;

    if (signals.hasEnterpriseTerms) score += 25;
    if (signals.hasAPIDocumentation) score += 20;
    if (signals.hasTeamsPricing) score += 20;
    if (signals.hasIntegrations) score += 15;
    if (signals.hasCareersPage) score += 10;
    if (signals.hasStructuredData) score += 5;
    if (signals.metaQuality === 'high') score += 5;

    return Math.min(score, 100);
  }

  /**
   * Calculate B2C score (0-100)
   */
  private calculateB2CScore(signals: BusinessClassificationSignals): number {
    let score = 0;

    if (signals.hasShoppingCart) score += 30;
    if (signals.hasConsumerPricing) score += 25;
    if (signals.hasCheckoutFlow) score += 25;
    if (signals.hasShoppingCart && signals.hasCheckoutFlow) score += 10;
    if (signals.metaQuality === 'high') score += 5;

    return Math.min(score, 100);
  }

  /**
   * Calculate Marketplace score (0-100)
   */
  private calculateMarketplaceScore(signals: BusinessClassificationSignals): number {
    const content = signals.detectedKeywords.join(' ').toLowerCase();

    let score = 0;

    const marketplaceTerms = [
      'marketplace',
      'sellers',
      'buyers',
      'vendors',
      'list your product',
      'join as seller',
    ];

    for (const term of marketplaceTerms) {
      if (content.includes(term)) score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Extract main text content from page
   */
  private extractTextContent($: CheerioAPI): string {
    // Remove script and style elements
    $('script, style, noscript').remove();

    // Get text from body
    const text = $('body').text();

    // Clean up whitespace
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract main heading from page
   */
  private extractMainHeading($: CheerioAPI): string {
    const h1 = $('h1').first().text().trim();
    if (h1) return h1;

    const h2 = $('h2').first().text().trim();
    if (h2) return h2;

    return '';
  }

  /**
   * Extract keywords from meta and content
   */
  private extractKeywords($: CheerioAPI, metadata: WebsiteMetadata): string[] {
    const keywords: string[] = [];

    // Meta keywords
    const metaKeywords = $('meta[name="keywords"]').attr('content');
    if (metaKeywords) {
      keywords.push(...metaKeywords.split(',').map((k) => k.trim()));
    }

    // Description words
    if (metadata.description) {
      const words = metadata.description.split(/\s+/).slice(0, 20);
      keywords.push(...words);
    }

    return keywords;
  }

  /**
   * Extract employee count from metadata
   */
  private extractEmployeeCount(metadata: WebsiteMetadata): number | undefined {
    if (metadata.jsonLd?.numberOfEmployees) {
      const count = parseInt(String(metadata.jsonLd.numberOfEmployees), 10);
      if (!isNaN(count)) return count;
    }
    return undefined;
  }

  /**
   * Extract founding year from content
   */
  private extractFoundingYear(content: string): number | undefined {
    const match = content.match(/founded\s+(in\s+)?(\d{4})/i);
    if (match) {
      const year = parseInt(match[2], 10);
      if (year >= 1900 && year <= new Date().getFullYear()) {
        return year;
      }
    }
    return undefined;
  }

  /**
   * Assess quality of meta tags
   */
  private assessMetaQuality(metadata: WebsiteMetadata): 'high' | 'medium' | 'low' {
    let score = 0;

    if (metadata.title && metadata.title.length > 10) score++;
    if (metadata.description && metadata.description.length > 50) score++;
    if (metadata.ogTitle) score++;
    if (metadata.ogDescription) score++;
    if (metadata.jsonLd) score += 2;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Check if content contains any of the terms
   */
  private containsAny(content: string, terms: string[]): boolean {
    return terms.some((term) => content.includes(term));
  }

  /**
   * Clean and format description text
   */
  private cleanDescription(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '')
      .trim()
      .substring(0, 200); // Max 200 chars
  }

  /**
   * Build summary template based on business model and industry
   */
  private buildSummaryTemplate(
    businessModel: BusinessModel,
    industry: Industry,
    description: string,
  ): string {
    // Remove redundant prefixes from description
    const cleanDesc = description
      .replace(/^(a |an |the )/i, '')
      .replace(/^(company|platform|software|service|solution|tool|app|application|website)\s+(that|which|for|to)/i, '');

    // Build summary based on business model
    let modelPhrase = '';
    switch (businessModel) {
      case 'B2B':
        modelPhrase = 'B2B';
        break;
      case 'B2C':
        modelPhrase = 'B2C';
        break;
      case 'B2B2C':
        modelPhrase = 'B2B2C';
        break;
      case 'Marketplace':
        modelPhrase = 'marketplace';
        break;
      default:
        modelPhrase = '';
    }

    // Build industry phrase
    let industryPhrase = industry !== 'Other' ? industry.toLowerCase() : '';

    // Construct final summary
    const parts = ['A', modelPhrase, industryPhrase, 'company'];
    const summary = parts.filter(Boolean).join(' ');

    // Add description if available and meaningful
    if (cleanDesc.length > 10) {
      return `${summary} that ${cleanDesc.toLowerCase()}`;
    }

    return summary;
  }

  /**
   * Extract company size signals
   */
  private extractCompanySizeSignals(
    $: CheerioAPI,
    metadata: WebsiteMetadata,
  ): any {
    return {
      hasJobsPage: $('a[href*="career"], a[href*="jobs"]').length > 0,
      hasMultipleProducts: $('nav a').length > 10,
      hasInvestorRelations: this.extractTextContent($).toLowerCase().includes('investor relations'),
      hasGlobalPresence: this.extractTextContent($).toLowerCase().includes('global') ||
        this.extractTextContent($).toLowerCase().includes('worldwide'),
    };
  }
}
