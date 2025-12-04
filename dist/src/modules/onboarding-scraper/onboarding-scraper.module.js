"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingScraperModule = void 0;
const common_1 = require("@nestjs/common");
const onboarding_scraper_controller_1 = require("./onboarding-scraper.controller");
const onboarding_scraper_service_1 = require("./services/onboarding-scraper.service");
const domain_resolver_service_1 = require("./services/domain-resolver.service");
const business_intelligence_service_1 = require("./services/business-intelligence.service");
const prisma_module_1 = require("../../prisma/prisma.module");
let OnboardingScraperModule = class OnboardingScraperModule {
};
exports.OnboardingScraperModule = OnboardingScraperModule;
exports.OnboardingScraperModule = OnboardingScraperModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [onboarding_scraper_controller_1.OnboardingScraperController],
        providers: [
            onboarding_scraper_service_1.OnboardingScraperService,
            domain_resolver_service_1.DomainResolverService,
            business_intelligence_service_1.BusinessIntelligenceService,
        ],
        exports: [onboarding_scraper_service_1.OnboardingScraperService],
    })
], OnboardingScraperModule);
//# sourceMappingURL=onboarding-scraper.module.js.map