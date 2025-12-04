export interface AudioSplitResult {
    hostAudioPath: string;
    guestAudioPath: string;
}
export declare class AudioProcessorService {
    private readonly logger;
    splitStereoAudio(stereoAudioPath: string, outputDir: string): Promise<AudioSplitResult>;
    private extractChannel;
    getAudioDuration(audioPath: string): Promise<number>;
    convertToWhisperFormat(inputPath: string, outputPath: string): Promise<void>;
    convertStereoToIntelligentMono(stereoPath: string, outputPath: string): Promise<void>;
    removeEchoWithSidechain(stereoPath: string, outputPath: string): Promise<void>;
    checkFFmpegInstalled(): Promise<boolean>;
}
