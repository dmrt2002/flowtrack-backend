export declare enum SpeakerState {
    SPEAKING = "speaking",
    SILENT = "silent"
}
export declare class SpeakerEventDto {
    timestamp: number;
    speakerName: string;
    state: SpeakerState;
}
