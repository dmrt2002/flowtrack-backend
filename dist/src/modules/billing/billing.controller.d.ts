import { BillingService } from './billing.service';
import type { UserPayload } from '../../auth/decorators/user.decorator';
import type { CreateCheckoutSessionDto } from './dto';
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
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
    getWorkspaceSubscription(user: UserPayload, workspaceId: string): Promise<{
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
    getWorkspaceUsage(user: UserPayload, workspaceId: string): Promise<{
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
    createCheckoutSession(user: UserPayload, workspaceId: string, dto: CreateCheckoutSessionDto): Promise<{
        sessionId: string;
        url: string;
        message: string;
    }>;
    createCustomerPortalSession(user: UserPayload, workspaceId: string): Promise<{
        url: string;
        message: string;
    }>;
    cancelSubscription(user: UserPayload, workspaceId: string): Promise<{
        success: boolean;
        message: string;
        currentPeriodEnd: Date;
    }>;
    reactivateSubscription(user: UserPayload, workspaceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
