export interface PyannoteSpeakerSegment {
    start: number;
    end: number;
    duration: number;
    speaker: string;
    startMs: number;
    endMs: number;
}
interface SpeakerEvent {
    ts: number;
    speaker: string;
    state: string;
}
export interface EnhancedSpeakerSegment extends PyannoteSpeakerSegment {
    speakerName: string;
    confidence: number;
    source: 'visual' | 'ai';
}
export declare class PyannoteDiarizationService {
    private readonly logger;
    diarize(audioPath: string, numSpeakers?: number): Promise<PyannoteSpeakerSegment[]>;
    enhanceWithVisualEvents(aiSegments: PyannoteSpeakerSegment[], visualEvents: SpeakerEvent[]): Promise<EnhancedSpeakerSegment[]>;
    checkPyannoteAvailable(): Promise<boolean>;
    getInstallationInstructions(): string;
}
export {};
