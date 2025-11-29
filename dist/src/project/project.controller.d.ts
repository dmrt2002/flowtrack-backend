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
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        description: string | null;
    }[]>;
    createProject(user: UserPayload, createProjectDto: CreateProjectDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        description: string | null;
    }>;
    getProjectById(user: UserPayload, id: string): Promise<{
        workspace: {
            name: string;
            id: string;
            slug: string;
            intakeEmailId: string;
            ownerUserId: string;
            timezone: string;
            settings: import("@prisma/client/runtime/library").JsonValue;
            isActive: boolean;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
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
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        description: string | null;
    }>;
    updateProject(user: UserPayload, id: string, updateProjectDto: UpdateProjectDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        description: string | null;
    }>;
    deleteProject(user: UserPayload, id: string): Promise<{
        message: string;
    }>;
}
