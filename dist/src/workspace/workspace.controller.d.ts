import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import type { UserPayload } from '../auth/decorators/user.decorator';
import { AuthService } from '../auth/auth.service';
export declare class WorkspaceController {
    private readonly workspaceService;
    private readonly authService;
    constructor(workspaceService: WorkspaceService, authService: AuthService);
    getUserWorkspaces(userPayload: UserPayload): Promise<{
        role: string;
        membershipId: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
    }[]>;
    createWorkspace(userPayload: UserPayload, createWorkspaceDto: CreateWorkspaceDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
    }>;
    getWorkspaceById(userPayload: UserPayload, id: string): Promise<{
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
    getWorkspaceMembers(userPayload: UserPayload, id: string): Promise<{
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
    inviteUser(userPayload: UserPayload, id: string, inviteUserDto: InviteUserDto): Promise<{
        message: string;
        inviteId: string;
    }>;
}
