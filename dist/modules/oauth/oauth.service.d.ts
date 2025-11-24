import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export declare class OAuthService {
    private prisma;
    private config;
    private oauth2Client;
    constructor(prisma: PrismaService, config: ConfigService);
    getGmailAuthUrl(): string;
    exchangeCodeForTokens(code: string): Promise<{
        accessToken: any;
        refreshToken: any;
        expiresAt: Date | null;
        email: string | null | undefined;
    }>;
    saveGmailCredentials(userId: string, email: string, accessToken: string, refreshToken: string | null | undefined, expiresAt: Date | null): Promise<{
        refreshToken: string | null;
        id: string;
        expiresAt: Date | null;
        createdAt: Date;
        isActive: boolean;
        deletedAt: Date | null;
        updatedAt: Date;
        accessToken: string;
        workspaceId: string;
        providerType: import("@prisma/client").$Enums.OAuthProviderType;
        providerUserId: string | null;
        providerEmail: string | null;
        tokenType: string;
        scope: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        lastUsedAt: Date | null;
    }>;
    refreshAccessToken(refreshToken: string): Promise<{
        accessToken: any;
        expiresAt: Date | null;
    }>;
    getGmailCredentials(workspaceId: string): Promise<{
        accessToken: any;
        expiresAt: Date | null;
        refreshToken: string | null;
        id: string;
        createdAt: Date;
        isActive: boolean;
        deletedAt: Date | null;
        updatedAt: Date;
        workspaceId: string;
        providerType: import("@prisma/client").$Enums.OAuthProviderType;
        providerUserId: string | null;
        providerEmail: string | null;
        tokenType: string;
        scope: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        lastUsedAt: Date | null;
    } | null>;
    getEmailProvider(workspaceId: string): Promise<{
        type: "GMAIL";
        credentials: {
            accessToken: any;
            expiresAt: Date | null;
            refreshToken: string | null;
            id: string;
            createdAt: Date;
            isActive: boolean;
            deletedAt: Date | null;
            updatedAt: Date;
            workspaceId: string;
            providerType: import("@prisma/client").$Enums.OAuthProviderType;
            providerUserId: string | null;
            providerEmail: string | null;
            tokenType: string;
            scope: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            lastUsedAt: Date | null;
        };
        config?: undefined;
    } | {
        type: "SYSTEM";
        config: {
            host: any;
            port: number;
            secure: boolean;
            auth: {
                user: any;
                pass: any;
            };
            from: {
                email: any;
                name: any;
            };
        };
        credentials?: undefined;
    }>;
    saveCalendlyLink(workspaceId: string, calendlyLink: string): Promise<{
        refreshToken: string | null;
        id: string;
        expiresAt: Date | null;
        createdAt: Date;
        isActive: boolean;
        deletedAt: Date | null;
        updatedAt: Date;
        accessToken: string;
        workspaceId: string;
        providerType: import("@prisma/client").$Enums.OAuthProviderType;
        providerUserId: string | null;
        providerEmail: string | null;
        tokenType: string;
        scope: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        lastUsedAt: Date | null;
    }>;
    getCalendlyLink(workspaceId: string): Promise<string | null>;
    getCalendarCredentials(workspaceId: string): Promise<{
        accessToken: any;
        expiresAt: Date | null;
        refreshToken: string | null;
        id: string;
        createdAt: Date;
        isActive: boolean;
        deletedAt: Date | null;
        updatedAt: Date;
        workspaceId: string;
        providerType: import("@prisma/client").$Enums.OAuthProviderType;
        providerUserId: string | null;
        providerEmail: string | null;
        tokenType: string;
        scope: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        lastUsedAt: Date | null;
    } | null>;
}
