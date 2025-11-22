import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class AuthService {
    private prisma;
    private configService;
    private readonly logger;
    private clerkClient;
    constructor(prisma: PrismaService, configService: ConfigService);
    getOrCreateUser(authId: string): Promise<{
        id: string;
        authId: string;
        email: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    syncUserFromClerk(authId: string): Promise<{
        id: string;
        authId: string;
        email: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
