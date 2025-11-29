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
var CalendarLinkGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarLinkGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let CalendarLinkGeneratorService = CalendarLinkGeneratorService_1 = class CalendarLinkGeneratorService {
    prisma;
    logger = new common_1.Logger(CalendarLinkGeneratorService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateCalendlyLink(leadId, workspaceId) {
        const credential = await this.prisma.oAuthCredential.findFirst({
            where: {
                workspaceId,
                providerType: 'CALENDLY',
                isActive: true,
            },
        });
        if (!credential) {
            this.logger.warn(`No Calendly credential found for workspace ${workspaceId}`);
            return null;
        }
        const baseLink = credential.accessToken;
        if (!baseLink) {
            this.logger.warn(`No Calendly link found for workspace ${workspaceId}`);
            return null;
        }
        const utmContent = `lead_${leadId}`;
        const url = new URL(baseLink);
        url.searchParams.set('utm_content', utmContent);
        this.logger.log(`Generated Calendly link for lead ${leadId}`);
        return url.toString();
    }
    async getPrimaryCalendarLink(leadId, workspaceId) {
        const calendlyLink = await this.generateCalendlyLink(leadId, workspaceId);
        if (calendlyLink) {
            return {
                provider: 'CALENDLY',
                link: calendlyLink,
            };
        }
        return {
            provider: null,
            link: null,
        };
    }
    async isCalendlyAvailable(workspaceId) {
        const credential = await this.prisma.oAuthCredential.findFirst({
            where: {
                workspaceId,
                providerType: 'CALENDLY',
                isActive: true,
            },
        });
        return !!credential;
    }
};
exports.CalendarLinkGeneratorService = CalendarLinkGeneratorService;
exports.CalendarLinkGeneratorService = CalendarLinkGeneratorService = CalendarLinkGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CalendarLinkGeneratorService);
//# sourceMappingURL=calendar-link-generator.service.js.map