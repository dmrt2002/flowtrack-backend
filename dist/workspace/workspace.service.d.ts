import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from './dto/invite-user.dto';
export declare class WorkspaceService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getUserWorkspaces(userId: string): Promise<{
        role: import("@prisma/client").$Enums.WorkspaceMemberRole;
        membershipId: string;
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        deletedAt: Date | null;
        updatedAt: Date;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    createWorkspace(userId: string, dto: CreateWorkspaceDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        deletedAt: Date | null;
        updatedAt: Date;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getWorkspaceById(userId: string, workspaceId: string): Promise<{
        role: import("@prisma/client").$Enums.WorkspaceMemberRole;
        members: ({
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            isActive: boolean;
            deletedAt: Date | null;
            updatedAt: Date;
            role: import("@prisma/client").$Enums.WorkspaceMemberRole;
            workspaceId: string;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            invitedByUserId: string | null;
            invitedAt: Date | null;
            joinedAt: Date | null;
        })[];
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        deletedAt: Date | null;
        updatedAt: Date;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getWorkspaceMembers(userId: string, workspaceId: string): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.WorkspaceMemberRole;
        user: {
            id: string;
            createdAt: Date;
            email: string;
            firstName: string | null;
            lastName: string | null;
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
