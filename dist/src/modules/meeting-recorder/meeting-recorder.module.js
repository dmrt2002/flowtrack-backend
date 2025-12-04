"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingRecorderModule = void 0;
const common_1 = require("@nestjs/common");
const meeting_recorder_gateway_1 = require("./meeting-recorder.gateway");
const meeting_recorder_service_1 = require("./meeting-recorder.service");
const meeting_recorder_controller_1 = require("./meeting-recorder.controller");
const prisma_module_1 = require("../../prisma/prisma.module");
const audio_processor_service_1 = require("./processors/audio-processor.service");
const transcription_service_1 = require("./processors/transcription.service");
const diarization_service_1 = require("./processors/diarization.service");
const summarization_service_1 = require("./processors/summarization.service");
const pyannote_diarization_service_1 = require("./processors/pyannote-diarization.service");
const processing_orchestrator_service_1 = require("./processors/processing-orchestrator.service");
let MeetingRecorderModule = class MeetingRecorderModule {
};
exports.MeetingRecorderModule = MeetingRecorderModule;
exports.MeetingRecorderModule = MeetingRecorderModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [
            meeting_recorder_gateway_1.MeetingRecorderGateway,
            meeting_recorder_service_1.MeetingRecorderService,
            audio_processor_service_1.AudioProcessorService,
            transcription_service_1.TranscriptionService,
            diarization_service_1.DiarizationService,
            summarization_service_1.SummarizationService,
            pyannote_diarization_service_1.PyannoteDiarizationService,
            processing_orchestrator_service_1.ProcessingOrchestratorService,
        ],
        controllers: [meeting_recorder_controller_1.MeetingRecorderController],
        exports: [meeting_recorder_service_1.MeetingRecorderService, processing_orchestrator_service_1.ProcessingOrchestratorService],
    })
], MeetingRecorderModule);
//# sourceMappingURL=meeting-recorder.module.js.map