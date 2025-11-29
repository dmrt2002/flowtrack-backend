import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import type { UserPayload } from '../auth/decorators/user.decorator';
export declare class TaskController {
    private readonly taskService;
    constructor(taskService: TaskService);
    getProjectTasks(user: UserPayload, projectId: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isComplete: boolean;
        title: string;
        projectId: string;
    }[]>;
    createTask(user: UserPayload, createTaskDto: CreateTaskDto): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isComplete: boolean;
        title: string;
        projectId: string;
    }>;
    updateTask(user: UserPayload, id: string, updateTaskDto: UpdateTaskDto): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isComplete: boolean;
        title: string;
        projectId: string;
    }>;
    deleteTask(user: UserPayload, id: string): Promise<{
        message: string;
    }>;
}
