import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../../auth/services/password.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto';
export declare class UserService {
    private readonly prisma;
    private readonly passwordService;
    constructor(prisma: PrismaService, passwordService: PasswordService);
    getUserProfile(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        emailVerifiedAt: Date | null;
        hasCompletedOnboarding: boolean;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        emailVerifiedAt: Date | null;
        hasCompletedOnboarding: boolean;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    getConnectedAccounts(userId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        providerType: import("@prisma/client").$Enums.OAuthProviderType;
        providerEmail: string | null;
    }[]>;
    disconnectOAuthAccount(userId: string, credentialId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteAccount(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
