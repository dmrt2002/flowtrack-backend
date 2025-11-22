import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from './dto/invite-user.dto';
export declare class WorkspaceService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getUserWorkspaces(userId: string): Promise<{
        role: string;
        membershipId: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
    }[]>;
    createWorkspace(userId: string, dto: CreateWorkspaceDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
    }>;
    getWorkspaceById(userId: string, workspaceId: string): Promise<{
        role: string;
        members: ({
            user: {
                id: string;
                email: string;
                name: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            role: string;
            userId: string;
            workspaceId: string;
        })[];
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
    }>;
    getWorkspaceMembers(userId: string, workspaceId: string): Promise<{
        id: string;
        role: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            createdAt: Date;
        };
        joinedAt: Date;
    }[]>;
    inviteUser(userId: string, workspaceId: string, dto: InviteUserDto): Promise<{
        message: string;
        inviteId: string;
    }>;
    checkUserWorkspaceAccess(userId: string, workspaceId: string): Promise<void>;
    getUserRole(userId: string, workspaceId: string): Promise<string>;
}
