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
var BillingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
let BillingService = BillingService_1 = class BillingService {
    prisma;
    configService;
    logger = new common_1.Logger(BillingService_1.name);
    stripeSecretKey;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY') || '';
    }
    async getAvailablePlans() {
        const plans = await this.prisma.subscriptionPlan.findMany({
            where: {
                isActive: true,
                isVisible: true,
            },
            orderBy: {
                displayOrder: 'asc',
            },
        });
        return plans;
    }
    async getWorkspaceSubscription(userId, workspaceId) {
        await this.checkWorkspaceAccess(userId, workspaceId);
        const subscription = await this.prisma.subscription.findFirst({
            where: { workspaceId },
            include: {
                subscriptionPlan: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!subscription) {
            return null;
        }
        return {
            id: subscription.id,
            plan: subscription.subscriptionPlan,
            status: subscription.status,
            billingCycle: subscription.billingCycle,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            trialEndDate: subscription.trialEndDate,
        };
    }
    async getWorkspaceUsage(userId, workspaceId) {
        await this.checkWorkspaceAccess(userId, workspaceId);
        const subscription = await this.prisma.subscription.findFirst({
            where: { workspaceId },
            include: {
                subscriptionPlan: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('No active subscription found for workspace');
        }
        const quotas = subscription.subscriptionPlan.quotas;
        const [workflowCount, memberCount, leadCount,] = await Promise.all([
            this.prisma.workflow.count({ where: { workspaceId, status: 'active' } }),
            this.prisma.workspaceMember.count({ where: { workspaceId } }),
            this.prisma.lead.count({
                where: {
                    workspaceId,
                    createdAt: {
                        gte: subscription.currentPeriodStart,
                        lte: subscription.currentPeriodEnd,
                    },
                },
            }),
        ]);
        return {
            workflows: {
                used: workflowCount,
                limit: quotas.maxWorkflows || 0,
                percentage: quotas.maxWorkflows ? (workflowCount / quotas.maxWorkflows) * 100 : 0,
            },
            teamMembers: {
                used: memberCount,
                limit: quotas.maxTeamMembers || 0,
                percentage: quotas.maxTeamMembers ? (memberCount / quotas.maxTeamMembers) * 100 : 0,
            },
            monthlyLeads: {
                used: leadCount,
                limit: quotas.maxLeadsPerMonth || 0,
                percentage: quotas.maxLeadsPerMonth ? (leadCount / quotas.maxLeadsPerMonth) * 100 : 0,
            },
        };
    }
    async createCheckoutSession(userId, workspaceId, dto) {
        const membership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
        if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
            throw new common_1.ForbiddenException('Only admins and owners can manage billing');
        }
        const plan = await this.prisma.subscriptionPlan.findUnique({
            where: { id: dto.planId },
        });
        if (!plan) {
            throw new common_1.NotFoundException('Subscription plan not found');
        }
        this.logger.log(`Would create Stripe checkout for workspace ${workspaceId}, plan ${plan.name}, cycle ${dto.billingCycle}`);
        return {
            sessionId: 'mock_session_id',
            url: 'https://checkout.stripe.com/mock',
            message: 'Stripe integration pending - this is a placeholder response',
        };
    }
    async createCustomerPortalSession(userId, workspaceId) {
        const membership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
        if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
            throw new common_1.ForbiddenException('Only admins and owners can access billing portal');
        }
        const subscription = await this.prisma.subscription.findFirst({
            where: { workspaceId },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!subscription || !subscription.stripeCustomerId) {
            throw new common_1.BadRequestException('No Stripe customer found for this workspace');
        }
        this.logger.log(`Would create Stripe portal session for customer ${subscription.stripeCustomerId}`);
        return {
            url: 'https://billing.stripe.com/mock',
            message: 'Stripe integration pending - this is a placeholder response',
        };
    }
    async cancelSubscription(userId, workspaceId) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace || workspace.ownerUserId !== userId) {
            throw new common_1.ForbiddenException('Only workspace owners can cancel subscriptions');
        }
        const subscription = await this.prisma.subscription.findFirst({
            where: { workspaceId, status: 'active' },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('No active subscription found');
        }
        await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                cancelAtPeriodEnd: true,
            },
        });
        this.logger.log(`Subscription ${subscription.id} will cancel at period end`);
        return {
            success: true,
            message: 'Subscription will be cancelled at the end of the current billing period',
            currentPeriodEnd: subscription.currentPeriodEnd,
        };
    }
    async reactivateSubscription(userId, workspaceId) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace || workspace.ownerUserId !== userId) {
            throw new common_1.ForbiddenException('Only workspace owners can reactivate subscriptions');
        }
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                workspaceId,
                cancelAtPeriodEnd: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('No cancelled subscription found to reactivate');
        }
        await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                cancelAtPeriodEnd: false,
            },
        });
        this.logger.log(`Subscription ${subscription.id} reactivated`);
        return {
            success: true,
            message: 'Subscription reactivated successfully',
        };
    }
    async checkWorkspaceAccess(userId, workspaceId) {
        const membership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('You do not have access to this workspace');
        }
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = BillingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], BillingService);
//# sourceMappingURL=billing.service.js.map