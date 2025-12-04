"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OnboardingScraperService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingScraperService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const prisma_service_1 = require("../../../prisma/prisma.service");
const domain_resolver_service_1 = require("./domain-resolver.service");
const business_intelligence_service_1 = require("./business-intelligence.service");
const scraper_types_1 = require("../types/scraper.types");
let OnboardingScraperService = OnboardingScraperService_1 = class OnboardingScraperService {
    prisma;
    domainResolver;
    businessIntel;
    logger = new common_1.Logger(OnboardingScraperService_1.name);
    constructor(prisma, domainResolver, businessIntel) {
        this.prisma = prisma;
        this.domainResolver = domainResolver;
        this.businessIntel = businessIntel;
    }
    async scrapeCompany(request) {
        try {
            this.logger.log(`Starting scrape for workflow: ${request.workflowId}`);
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
            const $ = cheerio.load(scrapedData.html);
            const metadata = this.extractMetadata($, domain);
            const businessModel = this.businessIntel.detectBusinessModel($, metadata);
            const industry = this.businessIntel.detectIndustry($, metadata);
            const companySize = this.businessIntel.detectCompanySize($, metadata);
            const summary = this.businessIntel.generateBusinessSummary(businessModel.model, industry.industry, metadata, $);
            const overallConfidence = this.calculateOverallConfidence(businessModel.confidence, industry.confidence, companySize.confidence, metadata);
            const logo = await this.getCompanyLogo(domain);
            const enrichedData = {
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
            await this.storeEnrichedData(request.workflowId, enrichedData);
            this.logger.log(`Successfully enriched company data for workflow: ${request.workflowId}`);
            return {
                success: true,
                data: enrichedData,
            };
        }
        catch (error) {
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
    async resolveDomain(request) {
        if (request.website) {
            const parsed = this.domainResolver.parseUserProvidedUrl(request.website);
            if (parsed) {
                return parsed;
            }
        }
        if (request.companyName) {
            const result = await this.domainResolver.inferDomain(request.companyName);
            return result.domain;
        }
        return null;
    }
    async scrapeWebsite(domain) {
        try {
            try {
                const response = await axios_1.default.get(`https://${domain}`, {
                    timeout: scraper_types_1.DEFAULT_SCRAPING_CONFIG.timeout,
                    maxRedirects: 5,
                    headers: {
                        'User-Agent': scraper_types_1.DEFAULT_SCRAPING_CONFIG.userAgent,
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
            }
            catch (httpsError) {
                this.logger.warn(`HTTPS failed for ${domain}, trying HTTP: ${httpsError.message}`);
            }
            const response = await axios_1.default.get(`http://${domain}`, {
                timeout: scraper_types_1.DEFAULT_SCRAPING_CONFIG.timeout,
                maxRedirects: 5,
                headers: {
                    'User-Agent': scraper_types_1.DEFAULT_SCRAPING_CONFIG.userAgent,
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
        }
        catch (error) {
            this.logger.error(`Failed to scrape ${domain}: ${error.message}`);
            return null;
        }
    }
    extractMetadata($, domain) {
        const metadata = {};
        metadata.title = $('title').text().trim();
        metadata.description = $('meta[name="description"]').attr('content')?.trim();
        metadata.ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
        metadata.ogDescription = $('meta[property="og:description"]').attr('content')?.trim();
        metadata.ogImage = $('meta[property="og:image"]').attr('content')?.trim();
        try {
            const jsonLdScript = $('script[type="application/ld+json"]').first().html();
            if (jsonLdScript) {
                const jsonLd = JSON.parse(jsonLdScript);
                metadata.jsonLd = jsonLd;
            }
        }
        catch (error) {
        }
        metadata.socialLinks = {
            linkedin: this.extractSocialLink($, 'linkedin.com'),
            twitter: this.extractSocialLink($, 'twitter.com') || this.extractSocialLink($, 'x.com'),
            facebook: this.extractSocialLink($, 'facebook.com'),
        };
        metadata.techStack = this.detectBasicTechStack($, domain);
        return metadata;
    }
    extractSocialLink($, platform) {
        const link = $(`a[href*="${platform}"]`).first().attr('href');
        if (link) {
            try {
                const url = new URL(link);
                return `${url.protocol}//${url.host}${url.pathname}`;
            }
            catch {
                return link;
            }
        }
        return undefined;
    }
    detectBasicTechStack($, domain) {
        const detected = [];
        const html = $.html();
        if (html.includes('google-analytics.com') || html.includes('gtag')) {
            detected.push('Google Analytics');
        }
        if (html.includes('intercom'))
            detected.push('Intercom');
        if (html.includes('drift'))
            detected.push('Drift');
        if (html.includes('zendesk'))
            detected.push('Zendesk');
        if (html.includes('hubspot'))
            detected.push('HubSpot');
        if (html.includes('marketo'))
            detected.push('Marketo');
        if (html.includes('stripe'))
            detected.push('Stripe');
        if (html.includes('paypal'))
            detected.push('PayPal');
        if (html.includes('wp-content') || html.includes('wordpress')) {
            detected.push('WordPress');
        }
        if (html.includes('shopify'))
            detected.push('Shopify');
        if (html.includes('_next'))
            detected.push('Next.js');
        if (html.includes('__nuxt'))
            detected.push('Nuxt.js');
        if (html.includes('react'))
            detected.push('React');
        return detected;
    }
    async getCompanyLogo(domain) {
        try {
            const logoUrl = `https://logo.clearbit.com/${domain}`;
            const response = await axios_1.default.head(logoUrl, {
                timeout: 3000,
                validateStatus: (status) => status === 200,
            });
            if (response.status === 200) {
                return logoUrl;
            }
            return undefined;
        }
        catch (error) {
            return undefined;
        }
    }
    calculateOverallConfidence(businessModelConf, industryConf, companySizeConf, metadata) {
        let confidence = businessModelConf * 0.4 +
            industryConf * 0.4 +
            companySizeConf * 0.2;
        if (metadata.jsonLd) {
            confidence += 0.05;
        }
        if (metadata.description && metadata.description.length > 100) {
            confidence += 0.05;
        }
        return Math.min(Math.round(confidence * 100) / 100, 0.95);
    }
    async storeEnrichedData(workflowId, enrichedData) {
        try {
            const workflow = await this.prisma.workflow.findUnique({
                where: { id: workflowId },
                select: { workspaceId: true },
            });
            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }
            const workspaceId = workflow.workspaceId;
            const workspace = await this.prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: { ownerUserId: true },
            });
            if (!workspace) {
                throw new Error(`Workspace not found: ${workspaceId}`);
            }
            const userId = workspace.ownerUserId;
            let session = await this.prisma.onboardingSession.findFirst({
                where: {
                    workspaceId,
                    userId,
                    isComplete: false,
                },
            });
            if (!session) {
                session = await this.prisma.onboardingSession.create({
                    data: {
                        workspaceId,
                        userId,
                        currentStep: 2,
                        completedSteps: [1],
                        selectedStrategyId: 'unified',
                        configurationData: JSON.parse(JSON.stringify({
                            enrichedCompany: enrichedData,
                        })),
                        isComplete: false,
                    },
                });
            }
            else {
                const existingConfig = session.configurationData || {};
                await this.prisma.onboardingSession.update({
                    where: { id: session.id },
                    data: {
                        configurationData: JSON.parse(JSON.stringify({
                            ...existingConfig,
                            enrichedCompany: enrichedData,
                        })),
                    },
                });
            }
            this.logger.log(`Stored enriched data in onboarding session: ${session.id}`);
        }
        catch (error) {
            this.logger.error(`Failed to store enriched data: ${error.message}`);
            throw error;
        }
    }
    async getEnrichedData(workflowId) {
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
            const config = session.configurationData;
            return config.enrichedCompany || null;
        }
        catch (error) {
            this.logger.error(`Failed to get enriched data: ${error.message}`);
            return null;
        }
    }
    async isEnrichmentComplete(workflowId) {
        const data = await this.getEnrichedData(workflowId);
        return data !== null;
    }
};
exports.OnboardingScraperService = OnboardingScraperService;
exports.OnboardingScraperService = OnboardingScraperService = OnboardingScraperService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        domain_resolver_service_1.DomainResolverService,
        business_intelligence_service_1.BusinessIntelligenceService])
], OnboardingScraperService);
//# sourceMappingURL=onboarding-scraper.service.js.map