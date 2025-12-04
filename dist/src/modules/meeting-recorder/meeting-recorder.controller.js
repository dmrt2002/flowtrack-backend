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
exports.MeetingRecorderController = void 0;
const common_1 = require("@nestjs/common");
const meeting_recorder_service_1 = require("./meeting-recorder.service");
const processing_orchestrator_service_1 = require("./processors/processing-orchestrator.service");
let MeetingRecorderController = class MeetingRecorderController {
    meetingRecorderService;
    processingOrchestrator;
    constructor(meetingRecorderService, processingOrchestrator) {
        this.meetingRecorderService = meetingRecorderService;
        this.processingOrchestrator = processingOrchestrator;
    }
    async listRecordings(workspaceId, limit, offset) {
        return this.meetingRecorderService.listRecordings(workspaceId, limit ? parseInt(limit.toString(), 10) : 50, offset ? parseInt(offset.toString(), 10) : 0);
    }
    async getRecording(id) {
        return this.meetingRecorderService.getRecording(id);
    }
    async getTranscript(id) {
        const recording = await this.meetingRecorderService.getRecording(id);
        if (!recording) {
            throw new Error('Recording not found');
        }
        return {
            meetingId: recording.id,
            meetingTitle: recording.meetingTitle,
            recordingStartedAt: recording.recordingStartedAt,
            durationSeconds: recording.durationSeconds,
            transcriptSegments: recording.transcriptSegments,
        };
    }
    async getSummary(id) {
        const recording = await this.meetingRecorderService.getRecording(id);
        if (!recording) {
            throw new Error('Recording not found');
        }
        return {
            meetingId: recording.id,
            meetingTitle: recording.meetingTitle,
            summary: recording.meetingSummary,
        };
    }
    async processRecording(id) {
        await this.processingOrchestrator.processRecording(id);
        return {
            success: true,
            message: 'Processing started',
            meetingId: id,
        };
    }
    async deleteRecording(id) {
        await this.meetingRecorderService.deleteRecording(id);
    }
};
exports.MeetingRecorderController = MeetingRecorderController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('workspaceId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], MeetingRecorderController.prototype, "listRecordings", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MeetingRecorderController.prototype, "getRecording", null);
__decorate([
    (0, common_1.Get)(':id/transcript'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MeetingRecorderController.prototype, "getTranscript", null);
__decorate([
    (0, common_1.Get)(':id/summary'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MeetingRecorderController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Post)(':id/process'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MeetingRecorderController.prototype, "processRecording", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MeetingRecorderController.prototype, "deleteRecording", null);
exports.MeetingRecorderController = MeetingRecorderController = __decorate([
    (0, common_1.Controller)('api/meeting-recordings'),
    __metadata("design:paramtypes", [meeting_recorder_service_1.MeetingRecorderService,
        processing_orchestrator_service_1.ProcessingOrchestratorService])
], MeetingRecorderController);
//# sourceMappingURL=meeting-recorder.controller.js.map