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
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
const dto_1 = require("./dto");
const user_decorator_1 = require("../auth/decorators/user.decorator");
let WorkspaceController = class WorkspaceController {
    workspaceService;
    constructor(workspaceService) {
        this.workspaceService = workspaceService;
    }
    async getUserWorkspaces(user) {
        return this.workspaceService.getUserWorkspaces(user.id);
    }
    async createWorkspace(user, createWorkspaceDto) {
        return this.workspaceService.createWorkspace(user.id, createWorkspaceDto);
    }
    async getWorkspaceById(user, id) {
        return this.workspaceService.getWorkspaceById(user.id, id);
    }
    async getWorkspaceMembers(user, id) {
        return this.workspaceService.getWorkspaceMembers(user.id, id);
    }
    async inviteUser(user, id, inviteUserDto) {
        return this.workspaceService.inviteUser(user.id, id, inviteUserDto);
    }
    async updateMemberRole(user, workspaceId, memberId, dto) {
        return this.workspaceService.updateMemberRole(user.id, workspaceId, memberId, dto);
    }
    async removeMember(user, workspaceId, memberId) {
        return this.workspaceService.removeMember(user.id, workspaceId, memberId);
    }
    async transferOwnership(user, workspaceId, dto) {
        return this.workspaceService.transferOwnership(user.id, workspaceId, dto);
    }
    async leaveWorkspace(user, workspaceId) {
        return this.workspaceService.leaveWorkspace(user.id, workspaceId);
    }
    async updateWorkspace(user, workspaceId, dto) {
        return this.workspaceService.updateWorkspace(user.id, workspaceId, dto);
    }
    async deleteWorkspace(user, workspaceId) {
        return this.workspaceService.deleteWorkspace(user.id, workspaceId);
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
__decorate([
    (0, common_1.Patch)(':id/members/:memberId/role'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a member\'s role' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Member role updated successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only admins and owners can change roles',
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('memberId')),
    __param(3, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.updateMemberRoleSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], WorkspaceController.prototype, "updateMemberRole", null);
__decorate([
    (0, common_1.Delete)(':id/members/:memberId'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a member from the workspace' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Member removed successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only admins and owners can remove members',
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('memberId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], WorkspaceController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Post)(':id/transfer-ownership'),
    (0, swagger_1.ApiOperation)({ summary: 'Transfer workspace ownership' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Ownership transferred successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only the owner can transfer ownership',
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.transferOwnershipSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], WorkspaceController.prototype, "transferOwnership", null);
__decorate([
    (0, common_1.Post)(':id/leave'),
    (0, swagger_1.ApiOperation)({ summary: 'Leave the workspace' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Left workspace successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Owners cannot leave (must transfer ownership first)',
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WorkspaceController.prototype, "leaveWorkspace", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update workspace settings' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Workspace updated successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only admins and owners can update workspace',
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.updateWorkspaceSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], WorkspaceController.prototype, "updateWorkspace", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete workspace' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Workspace deleted successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only the owner can delete the workspace',
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WorkspaceController.prototype, "deleteWorkspace", null);
exports.WorkspaceController = WorkspaceController = __decorate([
    (0, swagger_1.ApiTags)('Workspaces'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/workspace'),
    __metadata("design:paramtypes", [workspace_service_1.WorkspaceService])
], WorkspaceController);
//# sourceMappingURL=workspace.controller.js.map