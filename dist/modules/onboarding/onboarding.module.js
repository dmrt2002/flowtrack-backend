"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const onboarding_controller_1 = require("./onboarding.controller");
const onboarding_service_1 = require("./services/onboarding.service");
const strategy_template_service_1 = require("./services/strategy-template.service");
const configuration_service_1 = require("./services/configuration.service");
const simulation_service_1 = require("./services/simulation.service");
const prisma_module_1 = require("../../prisma/prisma.module");
const oauth_module_1 = require("../oauth/oauth.module");
let OnboardingModule = class OnboardingModule {
};
exports.OnboardingModule = OnboardingModule;
exports.OnboardingModule = OnboardingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            config_1.ConfigModule,
            oauth_module_1.OAuthModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: '6h',
                    },
                }),
            }),
        ],
        controllers: [onboarding_controller_1.OnboardingController],
        providers: [
            onboarding_service_1.OnboardingService,
            strategy_template_service_1.StrategyTemplateService,
            configuration_service_1.ConfigurationService,
            simulation_service_1.SimulationService,
        ],
        exports: [onboarding_service_1.OnboardingService],
    })
], OnboardingModule);
//# sourceMappingURL=onboarding.module.js.map