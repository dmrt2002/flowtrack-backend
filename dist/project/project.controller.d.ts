import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import type { UserPayload } from '../auth/decorators/user.decorator';
import { AuthService } from '../auth/auth.service';
export declare class ProjectController {
    private readonly projectService;
    private readonly authService;
    constructor(projectService: ProjectService, authService: AuthService);
    getWorkspaceProjects(userPayload: UserPayload, workspaceId: string): Promise<{
        taskCount: number;
        _count: {
            tasks: number;
        };
        description: string | null;
        id: string;
        createdAt: Date;
        name: string;
        deletedAt: Date | null;
        updatedAt: Date;
        workspaceId: string;
    }[]>;
    createProject(userPayload: UserPayload, createProjectDto: CreateProjectDto): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        name: string;
        deletedAt: Date | null;
        updatedAt: Date;
        workspaceId: string;
    }>;
    getProjectById(userPayload: UserPayload, id: string): Promise<{
        workspace: {
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
        };
        tasks: {
            description: string | null;
            id: string;
            createdAt: Date;
            deletedAt: Date | null;
            updatedAt: Date;
            title: string;
            projectId: string;
            isComplete: boolean;
        }[];
    } & {
        description: string | null;
        id: string;
        createdAt: Date;
        name: string;
        deletedAt: Date | null;
        updatedAt: Date;
        workspaceId: string;
    }>;
    updateProject(userPayload: UserPayload, id: string, updateProjectDto: UpdateProjectDto): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        name: string;
        deletedAt: Date | null;
        updatedAt: Date;
        workspaceId: string;
    }>;
    deleteProject(userPayload: UserPayload, id: string): Promise<{
        message: string;
    }>;
}
