import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import type { UserPayload } from '../auth/decorators/user.decorator';
export declare class ProjectController {
    private readonly projectService;
    constructor(projectService: ProjectService);
    getWorkspaceProjects(user: UserPayload, workspaceId: string): Promise<{
        taskCount: number;
        _count: {
            tasks: number;
        };
        id: string;
        workspaceId: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }[]>;
    createProject(user: UserPayload, createProjectDto: CreateProjectDto): Promise<{
        id: string;
        workspaceId: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    getProjectById(user: UserPayload, id: string): Promise<{
        workspace: {
            id: string;
            name: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            settings: import("@prisma/client/runtime/library").JsonValue;
            slug: string;
            intakeEmailId: string;
            ownerUserId: string;
            timezone: string;
            isActive: boolean;
        };
        tasks: {
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            isComplete: boolean;
            title: string;
            projectId: string;
        }[];
    } & {
        id: string;
        workspaceId: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    updateProject(user: UserPayload, id: string, updateProjectDto: UpdateProjectDto): Promise<{
        id: string;
        workspaceId: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    deleteProject(user: UserPayload, id: string): Promise<{
        message: string;
    }>;
}
