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
exports.WorkspaceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const workspace_service_1 = require("./workspace.service");
const create_workspace_dto_1 = require("./dto/create-workspace.dto");
const invite_user_dto_1 = require("./dto/invite-user.dto");
const user_decorator_1 = require("../auth/decorators/user.decorator");
const clerk_auth_guard_1 = require("../auth/guards/clerk-auth.guard");
const auth_service_1 = require("../auth/auth.service");
let WorkspaceController = class WorkspaceController {
    workspaceService;
    authService;
    constructor(workspaceService, authService) {
        this.workspaceService = workspaceService;
        this.authService = authService;
    }
    async getUserWorkspaces(userPayload) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.workspaceService.getUserWorkspaces(user.id);
    }
    async createWorkspace(userPayload, createWorkspaceDto) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.workspaceService.createWorkspace(user.id, createWorkspaceDto);
    }
    async getWorkspaceById(userPayload, id) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.workspaceService.getWorkspaceById(user.id, id);
    }
    async getWorkspaceMembers(userPayload, id) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.workspaceService.getWorkspaceMembers(user.id, id);
    }
    async inviteUser(userPayload, id, inviteUserDto) {
        const user = await this.authService.getOrCreateUser(userPayload.authId);
        return this.workspaceService.inviteUser(user.id, id, inviteUserDto);
    }
};
exports.WorkspaceController = WorkspaceController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all workspaces for the current user' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of workspaces the user is a member of',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WorkspaceController.prototype, "getUserWorkspaces", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new workspace' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Workspace created successfully',
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_workspace_dto_1.CreateWorkspaceDto]),
    __metadata("design:returntype", Promise)
], WorkspaceController.prototype, "createWorkspace", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a workspace by ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Workspace details',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Workspace not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'User does not have access to this workspace',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WorkspaceController.prototype, "getWorkspaceById", null);
__decorate([
    (0, common_1.Get)(':id/members'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all members of a workspace' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of workspace members',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WorkspaceController.prototype, "getWorkspaceMembers", null);
__decorate([
    (0, common_1.Post)(':id/invite'),
    (0, swagger_1.ApiOperation)({ summary: 'Invite a user to the workspace' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Invitation sent successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only admins can invite users',
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, invite_user_dto_1.InviteUserDto]),
    __metadata("design:returntype", Promise)
], WorkspaceController.prototype, "inviteUser", null);
exports.WorkspaceController = WorkspaceController = __decorate([
    (0, swagger_1.ApiTags)('Workspaces'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/workspace'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __metadata("design:paramtypes", [workspace_service_1.WorkspaceService,
        auth_service_1.AuthService])
], WorkspaceController);
//# sourceMappingURL=workspace.controller.js.map