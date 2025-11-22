import { CreateTaskDto } from './create-task.dto';
declare const UpdateTaskDto_base: import("@nestjs/common").Type<Partial<Omit<CreateTaskDto, "projectId">>>;
export declare class UpdateTaskDto extends UpdateTaskDto_base {
    isComplete?: boolean;
}
export {};
