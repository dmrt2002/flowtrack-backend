import { PrismaService } from '../../../prisma/prisma.service';
import { AudioProcessorService } from './audio-processor.service';
import { TranscriptionService } from './transcription.service';
import { PyannoteDiarizationService } from './pyannote-diarization.service';
import { SummarizationService } from './summarization.service';
export declare class ProcessingOrchestratorService {
    private prisma;
    private audioProcessor;
    private transcription;
    private pyannoteDiarization;
    private summarization;
    private readonly logger;
    private readonly storageDir;
    constructor(prisma: PrismaService, audioProcessor: AudioProcessorService, transcription: TranscriptionService, pyannoteDiarization: PyannoteDiarizationService, summarization: SummarizationService);
    processRecording(meetingId: string): Promise<void>;
    private processWithPyannote;
    private processWithStereoSplit;
    private mergeTranscriptWithDiarization;
    private inferSpeakerType;
    private loadSpeakerEvents;
    private correlateSpeakerWithVisual;
    private saveSegments;
    private formatTranscriptForSummary;
    private formatTimestamp;
}
