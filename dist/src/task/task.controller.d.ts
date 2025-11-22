import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import type { UserPayload } from '../auth/decorators/user.decorator';
import { AuthService } from '../auth/auth.service';
export declare class TaskController {
    private readonly taskService;
    private readonly authService;
    constructor(taskService: TaskService, authService: AuthService);
    getProjectTasks(userPayload: UserPayload, projectId: string): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        isComplete: boolean;
        projectId: string;
    }[]>;
    createTask(userPayload: UserPayload, createTaskDto: CreateTaskDto): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        isComplete: boolean;
        projectId: string;
    }>;
    updateTask(userPayload: UserPayload, id: string, updateTaskDto: UpdateTaskDto): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        isComplete: boolean;
        projectId: string;
    }>;
    deleteTask(userPayload: UserPayload, id: string): Promise<{
        message: string;
    }>;
}
