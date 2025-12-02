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
var RelayEmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelayEmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
const message_service_1 = require("./message.service");
let RelayEmailService = RelayEmailService_1 = class RelayEmailService {
    configService;
    messageService;
    logger = new common_1.Logger(RelayEmailService_1.name);
    transporter;
    constructor(configService, messageService) {
        this.configService = configService;
        this.messageService = messageService;
        this.initializeTransporter();
    }
    initializeTransporter() {
        const config = {
            host: this.configService.get('GMAIL_SMTP_HOST', 'smtp.gmail.com'),
            port: this.configService.get('GMAIL_SMTP_PORT', 587),
            secure: false,
            auth: {
                user: this.configService.get('GMAIL_RELAY_EMAIL', ''),
                pass: this.configService.get('GMAIL_RELAY_PASSWORD', ''),
            },
        };
        this.transporter = nodemailer.createTransport(config);
        this.transporter.verify((error, success) => {
            if (error) {
                this.logger.error('SMTP transporter verification failed', error);
            }
            else {
                this.logger.log('SMTP transporter is ready to send emails');
            }
        });
    }
    async sendEmailToLead(workspaceId, leadId, leadEmail, leadName, subject, textBody, htmlBody, senderName = 'FlowTrack') {
        const relayEmail = this.configService.get('GMAIL_RELAY_EMAIL', '');
        const [localPart, domain] = relayEmail.split('@');
        const replyToEmail = `${localPart}+${leadId}@${domain}`;
        const mailOptions = {
            from: `"${senderName} via FlowTrack" <${relayEmail}>`,
            replyTo: replyToEmail,
            to: leadName ? `"${leadName}" <${leadEmail}>` : leadEmail,
            subject,
            text: textBody,
            html: htmlBody || textBody,
        };
        try {
            this.logger.log(`Sending email to ${leadEmail} (Lead ID: ${leadId})`);
            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email sent successfully: ${info.messageId}`);
            const emailMessage = {
                from: {
                    email: relayEmail,
                    name: `${senderName} via FlowTrack`,
                },
                to: {
                    email: leadEmail,
                    name: leadName,
                },
                subject,
                textBody,
                htmlBody,
                messageId: info.messageId,
            };
            await this.messageService.createOutboundMessage(workspaceId, leadId, emailMessage);
            return { messageId: info.messageId };
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${leadEmail}`, error);
            throw error;
        }
    }
    async sendTemplatedEmail(workspaceId, leadId, leadEmail, leadName, subject, template, variables, senderName = 'FlowTrack') {
        let processedTemplate = template;
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            processedTemplate = processedTemplate.replace(regex, value);
        });
        return this.sendEmailToLead(workspaceId, leadId, leadEmail, leadName, subject, processedTemplate, undefined, senderName);
    }
};
exports.RelayEmailService = RelayEmailService;
exports.RelayEmailService = RelayEmailService = RelayEmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        message_service_1.MessageService])
], RelayEmailService);
//# sourceMappingURL=relay-email.service.js.map