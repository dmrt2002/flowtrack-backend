import { CreateProjectDto } from './create-project.dto';
declare const UpdateProjectDto_base: import("@nestjs/common").Type<Partial<Omit<CreateProjectDto, "workspaceId">>>;
export declare class UpdateProjectDto extends UpdateProjectDto_base {
}
export {};
