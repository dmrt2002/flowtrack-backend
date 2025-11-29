"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bullmq_1 = require("@nestjs/bullmq");
const token_manager_service_1 = require("./services/token-manager.service");
const webhook_verifier_service_1 = require("./services/webhook-verifier.service");
const attribution_matcher_service_1 = require("./services/attribution-matcher.service");
const calendly_service_1 = require("./services/calendly.service");
const polling_service_1 = require("./services/polling.service");
const polling_queue_service_1 = require("./services/polling-queue.service");
const calendar_link_generator_service_1 = require("./services/calendar-link-generator.service");
const oauth_state_manager_service_1 = require("./services/oauth-state-manager.service");
const calendly_controller_1 = require("./controllers/calendly.controller");
const booking_health_controller_1 = require("./controllers/booking-health.controller");
const polling_processor_1 = require("./processors/polling.processor");
const prisma_service_1 = require("../../prisma/prisma.service");
let BookingModule = class BookingModule {
};
exports.BookingModule = BookingModule;
exports.BookingModule = BookingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
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
            bullmq_1.BullModule.registerQueue({
                name: 'booking-polling',
                defaultJobOptions: {
                    removeOnComplete: 100,
                    removeOnFail: 50,
                },
            }),
        ],
        controllers: [calendly_controller_1.CalendlyController, booking_health_controller_1.BookingHealthController],
        providers: [
            token_manager_service_1.TokenManagerService,
            webhook_verifier_service_1.WebhookVerifierService,
            attribution_matcher_service_1.AttributionMatcherService,
            calendly_service_1.CalendlyService,
            polling_service_1.PollingService,
            polling_queue_service_1.PollingQueueService,
            calendar_link_generator_service_1.CalendarLinkGeneratorService,
            oauth_state_manager_service_1.OAuthStateManagerService,
            polling_processor_1.PollingProcessor,
            prisma_service_1.PrismaService,
        ],
        exports: [
            token_manager_service_1.TokenManagerService,
            webhook_verifier_service_1.WebhookVerifierService,
            attribution_matcher_service_1.AttributionMatcherService,
            calendly_service_1.CalendlyService,
            polling_service_1.PollingService,
            polling_queue_service_1.PollingQueueService,
            calendar_link_generator_service_1.CalendarLinkGeneratorService,
            oauth_state_manager_service_1.OAuthStateManagerService,
        ],
    })
], BookingModule);
//# sourceMappingURL=booking.module.js.map