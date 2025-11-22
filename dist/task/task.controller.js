"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const task_service_1 = require("./task.service");
const create_task_dto_1 = require("./dto/create-task.dto");
const update_task_dto_1 = require("./dto/update-task.dto");
const user_decorator_1 = require("../auth/decorators/user.decorator");
const clerk_auth_guard_1 = require("../auth/guards/clerk-auth.guard");
const auth_service_1 = require("../auth/auth.service");
let TaskController = class TaskController {
    taskService;
    authService;
    constructor(taskService, authService) {
        this.taskService = taskService;
        this.authService = authService;
    }
    async getProjectTasks(userPayload, projectId) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.taskService.getProjectTasks(user.id, projectId);
    }
    async createTask(userPayload, createTaskDto) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.taskService.createTask(user.id, createTaskDto);
    }
    async updateTask(userPayload, id, updateTaskDto) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.taskService.updateTask(user.id, id, updateTaskDto);
    }
    async deleteTask(userPayload, id) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.taskService.deleteTask(user.id, id);
    }
};
exports.TaskController = TaskController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all tasks for a project' }),
    (0, swagger_1.ApiQuery)({
        name: 'projectId',
        required: true,
        description: 'The project ID',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "getProjectTasks", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new task' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_task_dto_1.CreateTaskDto]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "createTask", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a task' }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_task_dto_1.UpdateTaskDto]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "updateTask", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a task' }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "deleteTask", null);
exports.TaskController = TaskController = __decorate([
    (0, swagger_1.ApiTags)('Tasks'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/task'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __metadata("design:paramtypes", [task_service_1.TaskService,
        auth_service_1.AuthService])
], TaskController);
//# sourceMappingURL=task.controller.js.map