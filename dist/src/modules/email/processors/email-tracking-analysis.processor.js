"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailTrackingAnalysisProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTrackingAnalysisProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const dns_resolver_service_1 = require("../services/dns-resolver.service");
const tracking_classifier_service_1 = require("../services/tracking-classifier.service");
const email_tracking_service_1 = require("../services/email-tracking.service");
let EmailTrackingAnalysisProcessor = EmailTrackingAnalysisProcessor_1 = class EmailTrackingAnalysisProcessor extends bullmq_1.WorkerHost {
    dnsResolver;
    classifier;
    emailTracking;
    logger = new common_1.Logger(EmailTrackingAnalysisProcessor_1.name);
    constructor(dnsResolver, classifier, emailTracking) {
        super();
        this.dnsResolver = dnsResolver;
        this.classifier = classifier;
        this.emailTracking = emailTracking;
    }
    async process(job) {
        const { clientIp, userAgent, sentAt, leadId, workflowExecutionId, emailType } = job.data;
        this.logger.debug(`Processing tracking analysis job: leadId=${leadId}, clientIp=${clientIp}`);
        try {
            const sentEmail = await this.emailTracking.findSentEmailByPayload({
                leadId,
                workflowExecutionId,
                emailType: emailType,
                sentAt,
            });
            if (!sentEmail) {
                this.logger.warn(`SentEmail not found for tracking event: leadId=${leadId}, executionId=${workflowExecutionId}`);
                return;
            }
            const { hostname, isAppleProxy } = await this.dnsResolver.reverseLookup(clientIp);
            this.logger.debug(`DNS lookup result: ip=${clientIp}, hostname=${hostname}, isApple=${isAppleProxy}`);
            const openedAt = Date.now();
            const sentAtTimestamp = new Date(sentEmail.sentAt).getTime();
            const { classification, timeDeltaSeconds } = this.classifier.classify(isAppleProxy, sentAtTimestamp, openedAt);
            this.logger.log(`Email tracking classified: sentEmailId=${sentEmail.id}, classification=${classification}, timeDelta=${timeDeltaSeconds}s`);
            await this.emailTracking.createTrackingEvent({
                sentEmailId: sentEmail.id,
                workspaceId: sentEmail.workspaceId,
                sentAt: sentEmail.sentAt,
                openedAt: new Date(openedAt),
                timeDeltaSeconds,
                clientIp,
                resolvedHostname: hostname,
                userAgent,
                isAppleProxy,
                classification,
                metadata: {
                    jobId: job.id,
                    processedAt: new Date().toISOString(),
                },
            });
            await this.emailTracking.updateSentEmailCounters(sentEmail.id, classification, new Date(openedAt));
            await this.emailTracking.recordEmailOpen({
                leadId,
                workflowExecutionId,
                emailType: emailType,
                sentAt,
            });
            this.logger.log(`Email tracking analysis completed: sentEmailId=${sentEmail.id}, classification=${classification}`);
        }
        catch (error) {
            this.logger.error(`Email tracking analysis failed: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.EmailTrackingAnalysisProcessor = EmailTrackingAnalysisProcessor;
exports.EmailTrackingAnalysisProcessor = EmailTrackingAnalysisProcessor = EmailTrackingAnalysisProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('email-tracking-analysis', {
        concurrency: 5,
    }),
    __metadata("design:paramtypes", [dns_resolver_service_1.DnsResolverService,
        tracking_classifier_service_1.TrackingClassifierService,
        email_tracking_service_1.EmailTrackingService])
], EmailTrackingAnalysisProcessor);
//# sourceMappingURL=email-tracking-analysis.processor.js.map