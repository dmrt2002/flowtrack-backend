"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MeetingRecorderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingRecorderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
let MeetingRecorderService = MeetingRecorderService_1 = class MeetingRecorderService {
    prisma;
    logger = new common_1.Logger(MeetingRecorderService_1.name);
    sessions = new Map();
    storageDir;
    constructor(prisma) {
        this.prisma = prisma;
        this.storageDir = path.join(process.cwd(), 'storage', 'meetings');
        this.initializeStorage();
    }
    async initializeStorage() {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
            this.logger.log(`Storage directory initialized: ${this.storageDir}`);
        }
        catch (error) {
            this.logger.error('Failed to initialize storage directory:', error);
        }
    }
    async startSession(payload) {
        try {
            let workspaceId = payload.workspaceId || '';
            if (!workspaceId || workspaceId === 'default') {
                const workspace = await this.prisma.workspace.findFirst();
                if (workspace) {
                    workspaceId = workspace.id;
                    this.logger.log(`Using first workspace for testing: ${workspaceId}`);
                }
                else {
                    throw new Error('No workspace found. Please create a workspace first.');
                }
            }
            const meeting = await this.prisma.meetingRecording.create({
                data: {
                    workspaceId: workspaceId,
                    leadId: payload.leadId || null,
                    meetingTitle: payload.meetingTitle || null,
                    meetingPlatform: payload.platform,
                    meetingUrl: payload.meetingUrl || null,
                    recordingStatus: client_1.RecordingStatus.RECORDING,
                    recordingStartedAt: new Date(),
                },
            });
            const sessionDir = path.join(this.storageDir, meeting.id);
            await fs.mkdir(sessionDir, { recursive: true });
            const audioPath = path.join(sessionDir, 'audio.webm');
            const eventsPath = path.join(sessionDir, 'events.jsonl');
            const audioStream = (0, fs_1.createWriteStream)(audioPath, { flags: 'a' });
            const eventsStream = (0, fs_1.createWriteStream)(eventsPath, { flags: 'a' });
            this.sessions.set(meeting.id, {
                meetingId: meeting.id,
                workspaceId: workspaceId,
                audioStream,
                eventsStream,
                audioPath,
                eventsPath,
                createdAt: new Date(),
            });
            this.logger.log(`Recording session started: ${meeting.id}`);
            return meeting.id;
        }
        catch (error) {
            this.logger.error('Failed to start recording session:', error);
            throw error;
        }
    }
    async writeAudioChunk(meetingId, chunk) {
        const session = this.sessions.get(meetingId);
        if (!session) {
            throw new Error(`Session not found: ${meetingId}`);
        }
        return new Promise((resolve, reject) => {
            const canWrite = session.audioStream.write(chunk);
            if (!canWrite) {
                session.audioStream.once('drain', () => {
                    resolve();
                });
            }
            else {
                resolve();
            }
            session.audioStream.once('error', (error) => {
                this.logger.error(`Audio stream error for ${meetingId}:`, error);
                reject(error);
            });
        });
    }
    async writeSpeakerEvent(meetingId, event) {
        const session = this.sessions.get(meetingId);
        if (!session) {
            throw new Error(`Session not found: ${meetingId}`);
        }
        return new Promise((resolve, reject) => {
            const line = JSON.stringify({
                ts: event.timestamp,
                speaker: event.speakerName,
                state: event.state,
            });
            session.eventsStream.write(line + '\n', (error) => {
                if (error) {
                    this.logger.error(`Events stream error for ${meetingId}:`, error);
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async endSession(meetingId) {
        const session = this.sessions.get(meetingId);
        if (!session) {
            this.logger.warn(`Session not found: ${meetingId}`);
            return;
        }
        try {
            await this.closeStream(session.audioStream);
            await this.closeStream(session.eventsStream);
            const stats = await fs.stat(session.audioPath);
            const fileSizeBytes = BigInt(stats.size);
            const durationMs = Date.now() - session.createdAt.getTime();
            const durationSeconds = Math.floor(durationMs / 1000);
            await this.prisma.meetingRecording.update({
                where: { id: meetingId },
                data: {
                    recordingEndedAt: new Date(),
                    recordingStatus: client_1.RecordingStatus.PROCESSING,
                    stereoAudioPath: path.relative(this.storageDir, session.audioPath),
                    eventsLogPath: path.relative(this.storageDir, session.eventsPath),
                    durationSeconds,
                    fileSizeBytes,
                },
            });
            this.sessions.delete(meetingId);
            this.logger.log(`Recording session ended: ${meetingId}`);
            this.logger.log(`🚀 Triggering post-processing for: ${meetingId}`);
        }
        catch (error) {
            this.logger.error(`Failed to end session ${meetingId}:`, error);
            await this.prisma.meetingRecording.update({
                where: { id: meetingId },
                data: {
                    recordingStatus: client_1.RecordingStatus.FAILED,
                    errorMessage: error.message,
                },
            });
            throw error;
        }
    }
    closeStream(stream) {
        return new Promise((resolve) => {
            if (stream.closed) {
                resolve();
                return;
            }
            stream.end(() => {
                resolve();
            });
        });
    }
    async getRecording(meetingId) {
        return this.prisma.meetingRecording.findUnique({
            where: { id: meetingId },
            include: {
                transcriptSegments: {
                    orderBy: { startTimeMs: 'asc' },
                },
                meetingSummary: true,
                lead: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }
    async listRecordings(workspaceId, limit = 50, offset = 0) {
        return this.prisma.meetingRecording.findMany({
            where: { workspaceId },
            include: {
                lead: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        transcriptSegments: true,
                    },
                },
            },
            orderBy: { recordingStartedAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }
    async deleteRecording(meetingId) {
        const recording = await this.prisma.meetingRecording.findUnique({
            where: { id: meetingId },
        });
        if (!recording) {
            throw new Error('Recording not found');
        }
        const sessionDir = path.join(this.storageDir, meetingId);
        try {
            await fs.rm(sessionDir, { recursive: true, force: true });
        }
        catch (error) {
            this.logger.warn(`Failed to delete files for ${meetingId}:`, error);
        }
        await this.prisma.meetingRecording.delete({
            where: { id: meetingId },
        });
        this.logger.log(`Recording deleted: ${meetingId}`);
    }
};
exports.MeetingRecorderService = MeetingRecorderService;
exports.MeetingRecorderService = MeetingRecorderService = MeetingRecorderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MeetingRecorderService);
//# sourceMappingURL=meeting-recorder.service.js.map