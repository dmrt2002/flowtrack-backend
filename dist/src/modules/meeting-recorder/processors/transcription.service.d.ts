export interface TranscriptSegment {
    startTimeMs: number;
    endTimeMs: number;
    text: string;
    confidence?: number;
}
export declare class TranscriptionService {
    private readonly logger;
    transcribe(audioPath: string): Promise<TranscriptSegment[]>;
    private runWhisper;
    private runWhisperCpp;
    private runWhisperPython;
    private checkCommand;
    checkWhisperInstalled(): Promise<boolean>;
    private mockTranscription;
}
