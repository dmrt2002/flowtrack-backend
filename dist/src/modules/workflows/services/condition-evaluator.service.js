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
var ConditionEvaluatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionEvaluatorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let ConditionEvaluatorService = ConditionEvaluatorService_1 = class ConditionEvaluatorService {
    prisma;
    logger = new common_1.Logger(ConditionEvaluatorService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async evaluateCondition(node, lead) {
        const conditionType = node.config?.conditionType;
        this.logger.log(`Evaluating condition: ${conditionType} for lead ${lead.id}`);
        switch (conditionType) {
            case 'budget_qualification':
                return this.checkBudgetQualification(node, lead);
            case 'reply_received':
                return this.checkReplyReceived(lead);
            case 'booking_completed':
                return this.checkBookingCompleted(lead);
            default:
                this.logger.warn(`Unknown condition type: ${conditionType}`);
                return true;
        }
    }
    async checkBudgetQualification(node, lead) {
        const threshold = node.config?.budgetThreshold || 2000;
        const budgetField = lead.fieldData?.find((field) => field.formField?.fieldKey === 'budget');
        if (!budgetField) {
            this.logger.log(`No budget field found for lead ${lead.id}, passing by default`);
            return true;
        }
        const budget = parseInt(budgetField.value);
        const qualified = budget >= threshold;
        this.logger.log(`Budget qualification: ${budget} >= ${threshold} = ${qualified}`);
        return qualified;
    }
    async checkReplyReceived(lead) {
        const replied = lead.lastEmailOpenedAt != null;
        this.logger.log(`Reply check for lead ${lead.id}: ${replied}`);
        return replied;
    }
    async checkBookingCompleted(lead) {
        const bookingCount = await this.prisma.booking.count({
            where: { leadId: lead.id },
        });
        const hasBooking = bookingCount > 0;
        this.logger.log(`Booking check for lead ${lead.id}: ${hasBooking} (count: ${bookingCount})`);
        return hasBooking;
    }
};
exports.ConditionEvaluatorService = ConditionEvaluatorService;
exports.ConditionEvaluatorService = ConditionEvaluatorService = ConditionEvaluatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConditionEvaluatorService);
//# sourceMappingURL=condition-evaluator.service.js.map