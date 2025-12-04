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
var ProcessingOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingOrchestratorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const audio_processor_service_1 = require("./audio-processor.service");
const transcription_service_1 = require("./transcription.service");
const pyannote_diarization_service_1 = require("./pyannote-diarization.service");
const summarization_service_1 = require("./summarization.service");
const client_1 = require("@prisma/client");
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const fs_1 = require("fs");
let ProcessingOrchestratorService = ProcessingOrchestratorService_1 = class ProcessingOrchestratorService {
    prisma;
    audioProcessor;
    transcription;
    pyannoteDiarization;
    summarization;
    logger = new common_1.Logger(ProcessingOrchestratorService_1.name);
    storageDir;
    constructor(prisma, audioProcessor, transcription, pyannoteDiarization, summarization) {
        this.prisma = prisma;
        this.audioProcessor = audioProcessor;
        this.transcription = transcription;
        this.pyannoteDiarization = pyannoteDiarization;
        this.summarization = summarization;
        this.storageDir = path.join(process.cwd(), 'storage', 'meetings');
    }
    async processRecording(meetingId) {
        this.logger.log(`🚀 Starting processing for meeting: ${meetingId}`);
        try {
            await this.prisma.meetingRecording.update({
                where: { id: meetingId },
                data: { recordingStatus: client_1.RecordingStatus.PROCESSING },
            });
            const sessionDir = path.join(this.storageDir, meetingId);
            const stereoAudioPath = path.join(sessionDir, 'audio.webm');
            const eventsLogPath = path.join(sessionDir, 'events.jsonl');
            const pyannoteAvailable = await this.pyannoteDiarization.checkPyannoteAvailable();
            if (!pyannoteAvailable) {
                this.logger.warn('⚠️ Pyannote not available, using fallback method');
                this.logger.log(this.pyannoteDiarization.getInstallationInstructions());
                await this.processWithStereoSplit(meetingId, stereoAudioPath, eventsLogPath);
                return;
            }
            await this.processWithPyannote(meetingId, stereoAudioPath, eventsLogPath);
            this.logger.log(`✅ Processing completed for meeting: ${meetingId}`);
        }
        catch (error) {
            this.logger.error(`❌ Processing failed for meeting ${meetingId}:`, error);
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
    async processWithPyannote(meetingId, stereoAudioPath, eventsLogPath) {
        const sessionDir = path.dirname(stereoAudioPath);
        this.logger.log('📊 Step 1: Converting stereo to intelligent mono...');
        const monoAudioPath = path.join(sessionDir, 'mono.wav');
        await this.audioProcessor.convertStereoToIntelligentMono(stereoAudioPath, monoAudioPath);
        this.logger.log('✓ Echo-reduced mono audio created');
        this.logger.log('📝 Step 2: Transcribing audio with Whisper...');
        const transcript = await this.transcription.transcribe(monoAudioPath);
        this.logger.log(`✓ Transcription completed: ${transcript.length} segments`);
        this.logger.log('🎤 Step 3: Running Pyannote speaker diarization...');
        const aiSegments = await this.pyannoteDiarization.diarize(monoAudioPath);
        this.logger.log(`✓ Diarization completed: ${aiSegments.length} segments`);
        this.logger.log('👁️ Step 4: Loading visual speaker events...');
        const visualEvents = await this.loadSpeakerEvents(eventsLogPath);
        this.logger.log(`✓ Loaded ${visualEvents.length} visual events`);
        this.logger.log('🔗 Step 5: Enhancing AI segments with visual speaker names...');
        const enhancedSegments = await this.pyannoteDiarization.enhanceWithVisualEvents(aiSegments, visualEvents);
        this.logger.log(`✓ Enhanced segments created: ${enhancedSegments.length}`);
        this.logger.log('🔀 Step 6: Merging transcript with speaker labels...');
        const finalSegments = this.mergeTranscriptWithDiarization(transcript, enhancedSegments);
        this.logger.log(`✓ Final merged segments: ${finalSegments.length}`);
        this.logger.log('💾 Step 7: Saving segments to database...');
        await this.saveSegments(meetingId, finalSegments);
        this.logger.log('✓ Segments saved');
        this.logger.log('📋 Step 8: Generating meeting summary...');
        await this.summarization.generateSummary(meetingId);
        this.logger.log('✓ Summary generated and saved');
        await this.prisma.meetingRecording.update({
            where: { id: meetingId },
            data: {
                recordingStatus: client_1.RecordingStatus.COMPLETED,
                processingCompletedAt: new Date(),
                monoAudioPath: path.relative(this.storageDir, monoAudioPath),
            },
        });
    }
    async processWithStereoSplit(meetingId, stereoAudioPath, eventsLogPath) {
        const sessionDir = path.dirname(stereoAudioPath);
        this.logger.log('📊 Using stereo split method (fallback)...');
        const { hostAudioPath, guestAudioPath } = await this.audioProcessor.splitStereoAudio(stereoAudioPath, sessionDir);
        const [hostTranscript, guestTranscript] = await Promise.all([
            this.transcription.transcribe(hostAudioPath),
            this.transcription.transcribe(guestAudioPath),
        ]);
        const visualEvents = await this.loadSpeakerEvents(eventsLogPath);
        const hostSegments = hostTranscript.map((segment) => ({
            ...segment,
            speakerName: 'YOU (Host)',
            speakerType: client_1.SpeakerType.HOST,
            confidence: 1.0,
        }));
        const guestSegments = guestTranscript.map((segment) => {
            const speaker = this.correlateSpeakerWithVisual(segment.startTimeMs, segment.endTimeMs, visualEvents);
            return {
                ...segment,
                speakerName: speaker,
                speakerType: client_1.SpeakerType.GUEST,
                confidence: 0.8,
            };
        });
        const allSegments = [...hostSegments, ...guestSegments].sort((a, b) => a.startTimeMs - b.startTimeMs);
        await this.saveSegments(meetingId, allSegments);
        await this.summarization.generateSummary(meetingId);
        await this.prisma.meetingRecording.update({
            where: { id: meetingId },
            data: {
                recordingStatus: client_1.RecordingStatus.COMPLETED,
                processingCompletedAt: new Date(),
            },
        });
    }
    mergeTranscriptWithDiarization(transcript, speakerSegments) {
        return transcript.map((textSegment) => {
            const matchingSpeaker = speakerSegments.find((speakerSeg) => speakerSeg.startMs <= textSegment.startTimeMs &&
                speakerSeg.endMs >= textSegment.startTimeMs);
            if (matchingSpeaker) {
                return {
                    ...textSegment,
                    speakerName: matchingSpeaker.speakerName,
                    speakerType: this.inferSpeakerType(matchingSpeaker.speakerName),
                    confidence: matchingSpeaker.confidence,
                };
            }
            return {
                ...textSegment,
                speakerName: 'Unknown Speaker',
                speakerType: client_1.SpeakerType.UNKNOWN,
                confidence: 0.5,
            };
        });
    }
    inferSpeakerType(speakerName) {
        if (speakerName.includes('Host') || speakerName.includes('YOU')) {
            return client_1.SpeakerType.HOST;
        }
        if (speakerName.startsWith('Speaker ')) {
            return client_1.SpeakerType.UNKNOWN;
        }
        return client_1.SpeakerType.GUEST;
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
    correlateSpeakerWithVisual(startTimeMs, endTimeMs, events) {
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
                    audioSource: segment.audioSource || 'MONO_CHANNEL',
                })),
            });
        });
    }
    formatTranscriptForSummary(segments) {
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
exports.ProcessingOrchestratorService = ProcessingOrchestratorService;
exports.ProcessingOrchestratorService = ProcessingOrchestratorService = ProcessingOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audio_processor_service_1.AudioProcessorService,
        transcription_service_1.TranscriptionService,
        pyannote_diarization_service_1.PyannoteDiarizationService,
        summarization_service_1.SummarizationService])
], ProcessingOrchestratorService);
//# sourceMappingURL=processing-orchestrator.service.js.map