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
var DiarizationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiarizationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const readline = __importStar(require("readline"));
const fs_1 = require("fs");
let DiarizationService = DiarizationService_1 = class DiarizationService {
    prisma;
    logger = new common_1.Logger(DiarizationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async diarizeTranscripts(meetingId, hostTranscript, guestTranscript, eventsLogPath) {
        try {
            this.logger.log(`Starting diarization for meeting: ${meetingId}`);
            const speakerEvents = await this.loadSpeakerEvents(eventsLogPath);
            this.logger.log(`Loaded ${speakerEvents.length} speaker events`);
            const hostSegments = hostTranscript.map((segment) => ({
                ...segment,
                speakerName: 'YOU (Host)',
                speakerType: client_1.SpeakerType.HOST,
                audioSource: 'HOST_CHANNEL',
            }));
            const guestSegments = guestTranscript.map((segment) => {
                const speaker = this.correlateSpeaker(segment.startTimeMs, segment.endTimeMs, speakerEvents);
                return {
                    ...segment,
                    speakerName: speaker,
                    speakerType: client_1.SpeakerType.GUEST,
                    audioSource: 'GUEST_CHANNEL',
                };
            });
            const allSegments = [...hostSegments, ...guestSegments].sort((a, b) => a.startTimeMs - b.startTimeMs);
            this.logger.log(`Diarization complete: ${allSegments.length} segments`);
            await this.saveSegments(meetingId, allSegments);
            this.logger.log(`Segments saved to database`);
        }
        catch (error) {
            this.logger.error('Failed to diarize transcripts:', error);
            throw error;
        }
    }
    correlateSpeaker(startTimeMs, endTimeMs, events) {
        const relevantEvents = events.filter((event) => event.ts >= startTimeMs && event.ts <= endTimeMs);
        if (relevantEvents.length === 0) {
            return 'Unknown Guest';
        }
        const speakerCounts = new Map();
        for (const event of relevantEvents) {
            const count = speakerCounts.get(event.speaker) || 0;
            speakerCounts.set(event.speaker, count + 1);
        }
        let maxCount = 0;
        let winner = 'Unknown Guest';
        for (const [speaker, count] of speakerCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                winner = speaker;
            }
        }
        return winner;
    }
    async loadSpeakerEvents(eventsLogPath) {
        const events = [];
        try {
            const fileStream = (0, fs_1.createReadStream)(eventsLogPath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity,
            });
            for await (const line of rl) {
                if (line.trim()) {
                    try {
                        const event = JSON.parse(line);
                        events.push(event);
                    }
                    catch (error) {
                        this.logger.warn(`Failed to parse event line: ${line}`);
                    }
                }
            }
            return events;
        }
        catch (error) {
            this.logger.error('Failed to load speaker events:', error);
            return [];
        }
    }
    async saveSegments(meetingId, segments) {
        await this.prisma.$transaction(async (tx) => {
            await tx.transcriptSegment.deleteMany({
                where: { meetingRecordingId: meetingId },
            });
            await tx.transcriptSegment.createMany({
                data: segments.map((segment) => ({
                    meetingRecordingId: meetingId,
                    speakerName: segment.speakerName,
                    speakerType: segment.speakerType,
                    text: segment.text,
                    startTimeMs: segment.startTimeMs,
                    endTimeMs: segment.endTimeMs,
                    confidence: segment.confidence,
                    audioSource: segment.audioSource,
                })),
            });
        });
    }
    async getSpeakers(meetingId) {
        const segments = await this.prisma.transcriptSegment.findMany({
            where: { meetingRecordingId: meetingId },
            select: { speakerName: true },
            distinct: ['speakerName'],
        });
        return segments.map((segment) => segment.speakerName);
    }
    async formatTranscript(meetingId) {
        const segments = await this.prisma.transcriptSegment.findMany({
            where: { meetingRecordingId: meetingId },
            orderBy: { startTimeMs: 'asc' },
        });
        return segments
            .map((segment) => {
            const timestamp = this.formatTimestamp(segment.startTimeMs);
            return `[${timestamp}] ${segment.speakerName}: ${segment.text}`;
        })
            .join('\n');
    }
    formatTimestamp(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
};
exports.DiarizationService = DiarizationService;
exports.DiarizationService = DiarizationService = DiarizationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DiarizationService);
//# sourceMappingURL=diarization.service.js.map