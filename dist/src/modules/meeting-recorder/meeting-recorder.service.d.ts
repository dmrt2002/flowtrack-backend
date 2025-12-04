import { PrismaService } from '../../prisma/prisma.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SpeakerEventDto } from './dto/speaker-event.dto';
export declare class MeetingRecorderService {
    private prisma;
    private readonly logger;
    private readonly sessions;
    private readonly storageDir;
    constructor(prisma: PrismaService);
    private initializeStorage;
    startSession(payload: StartSessionDto): Promise<string>;
    writeAudioChunk(meetingId: string, chunk: Buffer): Promise<void>;
    writeSpeakerEvent(meetingId: string, event: SpeakerEventDto): Promise<void>;
    endSession(meetingId: string): Promise<void>;
    private closeStream;
    getRecording(meetingId: string): Promise<({
        lead: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        meetingSummary: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            meetingRecordingId: string;
            summaryText: string;
            keyDecisions: import("@prisma/client/runtime/library").JsonValue | null;
            actionItems: import("@prisma/client/runtime/library").JsonValue | null;
            participants: string[];
            topics: string[];
            generatedBy: string;
            generationDurationMs: number | null;
            promptTokens: number | null;
            completionTokens: number | null;
        } | null;
        transcriptSegments: {
            id: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            createdAt: Date;
            text: string;
            confidence: import("@prisma/client/runtime/library").Decimal | null;
            speakerName: string;
            startTimeMs: number;
            meetingRecordingId: string;
            speakerType: import("@prisma/client").$Enums.SpeakerType;
            endTimeMs: number;
            audioSource: string;
        }[];
    } & {
        id: string;
        workspaceId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        errorMessage: string | null;
        leadId: string | null;
        meetingUrl: string | null;
        errorDetails: import("@prisma/client/runtime/library").JsonValue | null;
        workflowExecutionId: string | null;
        meetingTitle: string | null;
        meetingPlatform: string;
        recordingStatus: import("@prisma/client").$Enums.RecordingStatus;
        stereoAudioPath: string | null;
        monoAudioPath: string | null;
        hostAudioPath: string | null;
        guestAudioPath: string | null;
        eventsLogPath: string | null;
        recordingStartedAt: Date;
        recordingEndedAt: Date | null;
        processingStartedAt: Date | null;
        processingCompletedAt: Date | null;
        durationSeconds: number | null;
        fileSizeBytes: bigint | null;
    }) | null>;
    listRecordings(workspaceId: string, limit?: number, offset?: number): Promise<({
        _count: {
            transcriptSegments: number;
        };
        lead: {
            id: string;
            name: string | null;
            email: string;
        } | null;
    } & {
        id: string;
        workspaceId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        errorMessage: string | null;
        leadId: string | null;
        meetingUrl: string | null;
        errorDetails: import("@prisma/client/runtime/library").JsonValue | null;
        workflowExecutionId: string | null;
        meetingTitle: string | null;
        meetingPlatform: string;
        recordingStatus: import("@prisma/client").$Enums.RecordingStatus;
        stereoAudioPath: string | null;
        monoAudioPath: string | null;
        hostAudioPath: string | null;
        guestAudioPath: string | null;
        eventsLogPath: string | null;
        recordingStartedAt: Date;
        recordingEndedAt: Date | null;
        processingStartedAt: Date | null;
        processingCompletedAt: Date | null;
        durationSeconds: number | null;
        fileSizeBytes: bigint | null;
    })[]>;
    deleteRecording(meetingId: string): Promise<void>;
}
