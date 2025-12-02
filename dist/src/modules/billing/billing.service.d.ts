import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateCheckoutSessionDto } from './dto';
export declare class BillingService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    private readonly stripeSecretKey;
    constructor(prisma: PrismaService, configService: ConfigService);
    getAvailablePlans(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        slug: string;
        isActive: boolean;
        currency: string;
        displayOrder: number;
        priceMonthllyCents: number | null;
        priceYearlyCents: number | null;
        quotas: import("@prisma/client/runtime/library").JsonValue;
        features: import("@prisma/client/runtime/library").JsonValue | null;
        isVisible: boolean;
    }[]>;
    getWorkspaceSubscription(userId: string, workspaceId: string): Promise<{
        id: string;
        plan: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            slug: string;
            isActive: boolean;
            currency: string;
            displayOrder: number;
            priceMonthllyCents: number | null;
            priceYearlyCents: number | null;
            quotas: import("@prisma/client/runtime/library").JsonValue;
            features: import("@prisma/client/runtime/library").JsonValue | null;
            isVisible: boolean;
        };
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        billingCycle: import("@prisma/client").$Enums.BillingCycle;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialEndDate: Date | null;
    } | null>;
    getWorkspaceUsage(userId: string, workspaceId: string): Promise<{
        workflows: {
            used: number;
            limit: number;
            percentage: number;
        };
        teamMembers: {
            used: number;
            limit: number;
            percentage: number;
        };
        monthlyLeads: {
            used: number;
            limit: number;
            percentage: number;
        };
    }>;
    createCheckoutSession(userId: string, workspaceId: string, dto: CreateCheckoutSessionDto): Promise<{
        sessionId: string;
        url: string;
        message: string;
    }>;
    createCustomerPortalSession(userId: string, workspaceId: string): Promise<{
        url: string;
        message: string;
    }>;
    cancelSubscription(userId: string, workspaceId: string): Promise<{
        success: boolean;
        message: string;
        currentPeriodEnd: Date;
    }>;
    reactivateSubscription(userId: string, workspaceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private checkWorkspaceAccess;
}
