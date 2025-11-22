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
exports.ProjectController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const project_service_1 = require("./project.service");
const create_project_dto_1 = require("./dto/create-project.dto");
const update_project_dto_1 = require("./dto/update-project.dto");
const user_decorator_1 = require("../auth/decorators/user.decorator");
const clerk_auth_guard_1 = require("../auth/guards/clerk-auth.guard");
const auth_service_1 = require("../auth/auth.service");
let ProjectController = class ProjectController {
    projectService;
    authService;
    constructor(projectService, authService) {
        this.projectService = projectService;
        this.authService = authService;
    }
    async getWorkspaceProjects(userPayload, workspaceId) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.projectService.getWorkspaceProjects(user.id, workspaceId);
    }
    async createProject(userPayload, createProjectDto) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.projectService.createProject(user.id, createProjectDto);
    }
    async getProjectById(userPayload, id) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.projectService.getProjectById(user.id, id);
    }
    async updateProject(userPayload, id, updateProjectDto) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.projectService.updateProject(user.id, id, updateProjectDto);
    }
    async deleteProject(userPayload, id) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.projectService.deleteProject(user.id, id);
    }
};
exports.ProjectController = ProjectController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all projects for a workspace' }),
    (0, swagger_1.ApiQuery)({
        name: 'workspaceId',
        required: true,
        description: 'The workspace ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of projects',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Query)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "getWorkspaceProjects", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new project' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Project created successfully',
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_project_dto_1.CreateProjectDto]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "createProject", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a project by ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Project details with tasks',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Project not found',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "getProjectById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a project' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Project updated successfully',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_project_dto_1.UpdateProjectDto]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "updateProject", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a project (Admin only)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Project deleted successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only admins can delete projects',
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "deleteProject", null);
exports.ProjectController = ProjectController = __decorate([
    (0, swagger_1.ApiTags)('Projects'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/project'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __metadata("design:paramtypes", [project_service_1.ProjectService,
        auth_service_1.AuthService])
], ProjectController);
//# sourceMappingURL=project.controller.js.map