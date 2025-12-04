"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bullmq_1 = require("@nestjs/bullmq");
const workflow_email_service_1 = require("./workflow-email.service");
const email_tracking_service_1 = require("./services/email-tracking.service");
const sent_email_service_1 = require("./services/sent-email.service");
const dns_resolver_service_1 = require("./services/dns-resolver.service");
const tracking_classifier_service_1 = require("./services/tracking-classifier.service");
const email_tracking_controller_1 = require("./controllers/email-tracking.controller");
const sent_email_controller_1 = require("./controllers/sent-email.controller");
const email_tracking_analysis_processor_1 = require("./processors/email-tracking-analysis.processor");
const oauth_module_1 = require("../oauth/oauth.module");
const prisma_module_1 = require("../../prisma/prisma.module");
let EmailModule = class EmailModule {
};
exports.EmailModule = EmailModule;
exports.EmailModule = EmailModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            oauth_module_1.OAuthModule,
            prisma_module_1.PrismaModule,
            jwt_1.JwtModule.register({}),
            bullmq_1.BullModule.registerQueue({
                name: 'email-tracking-analysis',
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                    removeOnComplete: 100,
                    removeOnFail: 50,
                },
            }),
        ],
        controllers: [email_tracking_controller_1.EmailTrackingController, sent_email_controller_1.SentEmailController],
        providers: [
            workflow_email_service_1.WorkflowEmailService,
            email_tracking_service_1.EmailTrackingService,
            sent_email_service_1.SentEmailService,
            dns_resolver_service_1.DnsResolverService,
            tracking_classifier_service_1.TrackingClassifierService,
            email_tracking_analysis_processor_1.EmailTrackingAnalysisProcessor,
        ],
        exports: [workflow_email_service_1.WorkflowEmailService, email_tracking_service_1.EmailTrackingService, sent_email_service_1.SentEmailService],
    })
], EmailModule);
//# sourceMappingURL=email.module.js.map