import { MeetingRecorderService } from './meeting-recorder.service';
import { ProcessingOrchestratorService } from './processors/processing-orchestrator.service';
export declare class MeetingRecorderController {
    private meetingRecorderService;
    private processingOrchestrator;
    constructor(meetingRecorderService: MeetingRecorderService, processingOrchestrator: ProcessingOrchestratorService);
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
    getRecording(id: string): Promise<({
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
    getTranscript(id: string): Promise<{
        meetingId: string;
        meetingTitle: string | null;
        recordingStartedAt: Date;
        durationSeconds: number | null;
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
    }>;
    getSummary(id: string): Promise<{
        meetingId: string;
        meetingTitle: string | null;
        summary: {
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
    }>;
    processRecording(id: string): Promise<{
        success: boolean;
        message: string;
        meetingId: string;
    }>;
    deleteRecording(id: string): Promise<void>;
}
