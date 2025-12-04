"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BusinessIntelligenceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessIntelligenceService = void 0;
const common_1 = require("@nestjs/common");
let BusinessIntelligenceService = BusinessIntelligenceService_1 = class BusinessIntelligenceService {
    logger = new common_1.Logger(BusinessIntelligenceService_1.name);
    detectBusinessModel($, metadata) {
        const signals = this.extractBusinessModelSignals($, metadata);
        const b2bScore = this.calculateB2BScore(signals);
        const b2cScore = this.calculateB2CScore(signals);
        const marketplaceScore = this.calculateMarketplaceScore(signals);
        this.logger.debug(`Business model scores - B2B: ${b2bScore}, B2C: ${b2cScore}, Marketplace: ${marketplaceScore}`);
        if (marketplaceScore > 60) {
            return { model: 'Marketplace', confidence: marketplaceScore / 100 };
        }
        if (b2bScore > b2cScore * 1.5) {
            return { model: 'B2B', confidence: Math.min(b2bScore / 100, 0.95) };
        }
        if (b2cScore > b2bScore * 1.5) {
            return { model: 'B2C', confidence: Math.min(b2cScore / 100, 0.95) };
        }
        if (b2bScore > 40 && b2cScore > 40) {
            return { model: 'B2B2C', confidence: 0.7 };
        }
        return { model: 'B2B', confidence: 0.5 };
    }
    detectIndustry($, metadata) {
        const content = this.extractTextContent($);
        const keywords = metadata.description || '';
        const title = metadata.title || '';
        const allText = `${title} ${keywords} ${content}`.toLowerCase();
        const industries = {
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
        const scores = {};
        let maxScore = 0;
        let detectedIndustry = 'Other';
        for (const [industry, terms] of Object.entries(industries)) {
            let score = 0;
            for (const term of terms) {
                const regex = new RegExp(`\\b${term}\\b`, 'gi');
                const matches = allText.match(regex);
                if (matches) {
                    score += matches.length * 10;
                }
            }
            scores[industry] = score;
            if (score > maxScore) {
                maxScore = score;
                detectedIndustry = industry;
            }
        }
        const confidence = Math.min(maxScore / 50, 0.95);
        if (detectedIndustry === 'Technology' && scores['SaaS'] > 20) {
            detectedIndustry = 'SaaS';
        }
        this.logger.debug(`Industry detection: ${detectedIndustry} (confidence: ${confidence})`);
        return { industry: detectedIndustry, confidence };
    }
    detectCompanySize($, metadata) {
        const signals = this.extractCompanySizeSignals($, metadata);
        if (metadata.jsonLd?.numberOfEmployees) {
            const count = parseInt(String(metadata.jsonLd.numberOfEmployees), 10);
            if (!isNaN(count)) {
                if (count < 50)
                    return { size: 'Startup', confidence: 0.9 };
                if (count < 500)
                    return { size: 'SMB', confidence: 0.9 };
                if (count < 2000)
                    return { size: 'Mid-Market', confidence: 0.9 };
                return { size: 'Enterprise', confidence: 0.9 };
            }
        }
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
            if (content.includes(indicator))
                enterpriseScore += 20;
        }
        for (const indicator of startupIndicators) {
            if (content.includes(indicator))
                startupScore += 20;
        }
        if (enterpriseScore > 40) {
            return { size: 'Enterprise', confidence: 0.75 };
        }
        if (startupScore > 40) {
            return { size: 'Startup', confidence: 0.75 };
        }
        return { size: 'SMB', confidence: 0.6 };
    }
    generateBusinessSummary(businessModel, industry, metadata, $) {
        const description = metadata.ogDescription ||
            metadata.description ||
            metadata.jsonLd?.description ||
            this.extractMainHeading($) ||
            'company';
        const cleanDescription = this.cleanDescription(description);
        const template = this.buildSummaryTemplate(businessModel, industry, cleanDescription);
        return template;
    }
    extractBusinessModelSignals($, metadata) {
        const content = this.extractTextContent($).toLowerCase();
        const links = $('a[href]').map((_, el) => $(el).attr('href') || '').get().join(' ').toLowerCase();
        return {
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
            detectedKeywords: this.extractKeywords($, metadata),
            primaryVertical: this.detectIndustry($, metadata).industry,
            employeeCount: this.extractEmployeeCount(metadata),
            foundingYear: this.extractFoundingYear(content),
            hasCareersPage: links.includes('/careers') || links.includes('/jobs'),
            hasMultipleOffices: content.includes('offices') && content.includes('locations'),
            hasStructuredData: !!metadata.jsonLd,
            metaQuality: this.assessMetaQuality(metadata),
            contentDepth: content.length,
        };
    }
    calculateB2BScore(signals) {
        let score = 0;
        if (signals.hasEnterpriseTerms)
            score += 25;
        if (signals.hasAPIDocumentation)
            score += 20;
        if (signals.hasTeamsPricing)
            score += 20;
        if (signals.hasIntegrations)
            score += 15;
        if (signals.hasCareersPage)
            score += 10;
        if (signals.hasStructuredData)
            score += 5;
        if (signals.metaQuality === 'high')
            score += 5;
        return Math.min(score, 100);
    }
    calculateB2CScore(signals) {
        let score = 0;
        if (signals.hasShoppingCart)
            score += 30;
        if (signals.hasConsumerPricing)
            score += 25;
        if (signals.hasCheckoutFlow)
            score += 25;
        if (signals.hasShoppingCart && signals.hasCheckoutFlow)
            score += 10;
        if (signals.metaQuality === 'high')
            score += 5;
        return Math.min(score, 100);
    }
    calculateMarketplaceScore(signals) {
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
            if (content.includes(term))
                score += 20;
        }
        return Math.min(score, 100);
    }
    extractTextContent($) {
        $('script, style, noscript').remove();
        const text = $('body').text();
        return text.replace(/\s+/g, ' ').trim();
    }
    extractMainHeading($) {
        const h1 = $('h1').first().text().trim();
        if (h1)
            return h1;
        const h2 = $('h2').first().text().trim();
        if (h2)
            return h2;
        return '';
    }
    extractKeywords($, metadata) {
        const keywords = [];
        const metaKeywords = $('meta[name="keywords"]').attr('content');
        if (metaKeywords) {
            keywords.push(...metaKeywords.split(',').map((k) => k.trim()));
        }
        if (metadata.description) {
            const words = metadata.description.split(/\s+/).slice(0, 20);
            keywords.push(...words);
        }
        return keywords;
    }
    extractEmployeeCount(metadata) {
        if (metadata.jsonLd?.numberOfEmployees) {
            const count = parseInt(String(metadata.jsonLd.numberOfEmployees), 10);
            if (!isNaN(count))
                return count;
        }
        return undefined;
    }
    extractFoundingYear(content) {
        const match = content.match(/founded\s+(in\s+)?(\d{4})/i);
        if (match) {
            const year = parseInt(match[2], 10);
            if (year >= 1900 && year <= new Date().getFullYear()) {
                return year;
            }
        }
        return undefined;
    }
    assessMetaQuality(metadata) {
        let score = 0;
        if (metadata.title && metadata.title.length > 10)
            score++;
        if (metadata.description && metadata.description.length > 50)
            score++;
        if (metadata.ogTitle)
            score++;
        if (metadata.ogDescription)
            score++;
        if (metadata.jsonLd)
            score += 2;
        if (score >= 5)
            return 'high';
        if (score >= 3)
            return 'medium';
        return 'low';
    }
    containsAny(content, terms) {
        return terms.some((term) => content.includes(term));
    }
    cleanDescription(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,!?-]/g, '')
            .trim()
            .substring(0, 200);
    }
    buildSummaryTemplate(businessModel, industry, description) {
        const cleanDesc = description
            .replace(/^(a |an |the )/i, '')
            .replace(/^(company|platform|software|service|solution|tool|app|application|website)\s+(that|which|for|to)/i, '');
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
        let industryPhrase = industry !== 'Other' ? industry.toLowerCase() : '';
        const parts = ['A', modelPhrase, industryPhrase, 'company'];
        const summary = parts.filter(Boolean).join(' ');
        if (cleanDesc.length > 10) {
            return `${summary} that ${cleanDesc.toLowerCase()}`;
        }
        return summary;
    }
    extractCompanySizeSignals($, metadata) {
        return {
            hasJobsPage: $('a[href*="career"], a[href*="jobs"]').length > 0,
            hasMultipleProducts: $('nav a').length > 10,
            hasInvestorRelations: this.extractTextContent($).toLowerCase().includes('investor relations'),
            hasGlobalPresence: this.extractTextContent($).toLowerCase().includes('global') ||
                this.extractTextContent($).toLowerCase().includes('worldwide'),
        };
    }
};
exports.BusinessIntelligenceService = BusinessIntelligenceService;
exports.BusinessIntelligenceService = BusinessIntelligenceService = BusinessIntelligenceService_1 = __decorate([
    (0, common_1.Injectable)()
], BusinessIntelligenceService);
//# sourceMappingURL=business-intelligence.service.js.map