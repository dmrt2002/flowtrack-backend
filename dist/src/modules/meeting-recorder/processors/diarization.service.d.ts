import { PrismaService } from '../../../prisma/prisma.service';
import { TranscriptSegment } from './transcription.service';
export declare class DiarizationService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    diarizeTranscripts(meetingId: string, hostTranscript: TranscriptSegment[], guestTranscript: TranscriptSegment[], eventsLogPath: string): Promise<void>;
    private correlateSpeaker;
    private loadSpeakerEvents;
    private saveSegments;
    getSpeakers(meetingId: string): Promise<string[]>;
    formatTranscript(meetingId: string): Promise<string>;
    private formatTimestamp;
}
