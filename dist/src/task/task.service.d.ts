import { PrismaService } from '../prisma/prisma.service';
import { ProjectService } from '../project/project.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
export declare class TaskService {
    private prisma;
    private projectService;
    private readonly logger;
    constructor(prisma: PrismaService, projectService: ProjectService);
    getProjectTasks(userId: string, projectId: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isComplete: boolean;
        title: string;
        projectId: string;
    }[]>;
    createTask(userId: string, dto: CreateTaskDto): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isComplete: boolean;
        title: string;
        projectId: string;
    }>;
    updateTask(userId: string, taskId: string, dto: UpdateTaskDto): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isComplete: boolean;
        title: string;
        projectId: string;
    }>;
    deleteTask(userId: string, taskId: string): Promise<{
        message: string;
    }>;
}
