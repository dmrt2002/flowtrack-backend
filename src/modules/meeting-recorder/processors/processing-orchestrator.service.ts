import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AudioProcessorService } from './audio-processor.service';
import { TranscriptionService } from './transcription.service';
import { PyannoteDiarizationService } from './pyannote-diarization.service';
import { SummarizationService } from './summarization.service';
import { RecordingStatus, SpeakerType } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as readline from 'readline';
import { createReadStream } from 'fs';

interface SpeakerEvent {
  ts: number;
  speaker: string;
  state: string;
}

@Injectable()
export class ProcessingOrchestratorService {
  private readonly logger = new Logger(ProcessingOrchestratorService.name);
  private readonly storageDir: string;

  constructor(
    private prisma: PrismaService,
    private audioProcessor: AudioProcessorService,
    private transcription: TranscriptionService,
    private pyannoteDiarization: PyannoteDiarizationService,
    private summarization: SummarizationService,
  ) {
    this.storageDir = path.join(process.cwd(), 'storage', 'meetings');
  }

  /**
   * Main processing pipeline with echo removal and Pyannote diarization
   */
  async processRecording(meetingId: string): Promise<void> {
    this.logger.log(`🚀 Starting processing for meeting: ${meetingId}`);

    try {
      // Update status
      await this.prisma.meetingRecording.update({
        where: { id: meetingId },
        data: { recordingStatus: RecordingStatus.PROCESSING },
      });

      const sessionDir = path.join(this.storageDir, meetingId);
      const stereoAudioPath = path.join(sessionDir, 'audio.webm');
      const eventsLogPath = path.join(sessionDir, 'events.jsonl');

      // Check if Pyannote is available
      const pyannoteAvailable =
        await this.pyannoteDiarization.checkPyannoteAvailable();

      if (!pyannoteAvailable) {
        this.logger.warn('⚠️ Pyannote not available, using fallback method');
        this.logger.log(
          this.pyannoteDiarization.getInstallationInstructions(),
        );

        // Fallback to old stereo split method
        await this.processWithStereoSplit(
          meetingId,
          stereoAudioPath,
          eventsLogPath,
        );
        return;
      }

      // NEW PIPELINE: Echo removal + Pyannote + Visual enhancement
      await this.processWithPyannote(
        meetingId,
        stereoAudioPath,
        eventsLogPath,
      );

      this.logger.log(`✅ Processing completed for meeting: ${meetingId}`);
    } catch (error) {
      this.logger.error(`❌ Processing failed for meeting ${meetingId}:`, error);

      await this.prisma.meetingRecording.update({
        where: { id: meetingId },
        data: {
          recordingStatus: RecordingStatus.FAILED,
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * NEW: Process with intelligent mono + Pyannote diarization
   */
  private async processWithPyannote(
    meetingId: string,
    stereoAudioPath: string,
    eventsLogPath: string,
  ): Promise<void> {
    const sessionDir = path.dirname(stereoAudioPath);

    // Step 1: Convert stereo to intelligent mono (removes echo)
    this.logger.log('📊 Step 1: Converting stereo to intelligent mono...');
    const monoAudioPath = path.join(sessionDir, 'mono.wav');

    await this.audioProcessor.convertStereoToIntelligentMono(
      stereoAudioPath,
      monoAudioPath,
    );

    this.logger.log('✓ Echo-reduced mono audio created');

    // Step 2: Transcribe mono audio with Whisper
    this.logger.log('📝 Step 2: Transcribing audio with Whisper...');
    const transcript = await this.transcription.transcribe(monoAudioPath);
    this.logger.log(`✓ Transcription completed: ${transcript.length} segments`);

    // Step 3: Run Pyannote speaker diarization
    this.logger.log('🎤 Step 3: Running Pyannote speaker diarization...');
    const aiSegments = await this.pyannoteDiarization.diarize(monoAudioPath);
    this.logger.log(`✓ Diarization completed: ${aiSegments.length} segments`);

    // Step 4: Load visual speaker events
    this.logger.log('👁️ Step 4: Loading visual speaker events...');
    const visualEvents = await this.loadSpeakerEvents(eventsLogPath);
    this.logger.log(`✓ Loaded ${visualEvents.length} visual events`);

    // Step 5: Enhance AI segments with visual names
    this.logger.log('🔗 Step 5: Enhancing AI segments with visual speaker names...');
    const enhancedSegments =
      await this.pyannoteDiarization.enhanceWithVisualEvents(
        aiSegments,
        visualEvents,
      );
    this.logger.log(`✓ Enhanced segments created: ${enhancedSegments.length}`);

    // Step 6: Merge transcription with diarization
    this.logger.log('🔀 Step 6: Merging transcript with speaker labels...');
    const finalSegments = this.mergeTranscriptWithDiarization(
      transcript,
      enhancedSegments,
    );
    this.logger.log(`✓ Final merged segments: ${finalSegments.length}`);

    // Step 7: Save segments to database
    this.logger.log('💾 Step 7: Saving segments to database...');
    await this.saveSegments(meetingId, finalSegments);
    this.logger.log('✓ Segments saved');

    // Step 8: Generate summary
    this.logger.log('📋 Step 8: Generating meeting summary...');
    await this.summarization.generateSummary(meetingId);
    this.logger.log('✓ Summary generated and saved');

    // Mark as completed
    await this.prisma.meetingRecording.update({
      where: { id: meetingId },
      data: {
        recordingStatus: RecordingStatus.COMPLETED,
        processingCompletedAt: new Date(),
        monoAudioPath: path.relative(this.storageDir, monoAudioPath),
      },
    });
  }

  /**
   * FALLBACK: Old method using stereo split (when Pyannote not available)
   */
  private async processWithStereoSplit(
    meetingId: string,
    stereoAudioPath: string,
    eventsLogPath: string,
  ): Promise<void> {
    const sessionDir = path.dirname(stereoAudioPath);

    this.logger.log('📊 Using stereo split method (fallback)...');

    // Split stereo into two mono channels
    const { hostAudioPath, guestAudioPath } =
      await this.audioProcessor.splitStereoAudio(stereoAudioPath, sessionDir);

    // Transcribe both channels
    const [hostTranscript, guestTranscript] = await Promise.all([
      this.transcription.transcribe(hostAudioPath),
      this.transcription.transcribe(guestAudioPath),
    ]);

    // Load visual events
    const visualEvents = await this.loadSpeakerEvents(eventsLogPath);

    // Label segments using old method
    const hostSegments = hostTranscript.map((segment) => ({
      ...segment,
      speakerName: 'YOU (Host)',
      speakerType: SpeakerType.HOST,
      confidence: 1.0,
    }));

    const guestSegments = guestTranscript.map((segment) => {
      const speaker = this.correlateSpeakerWithVisual(
        segment.startTimeMs,
        segment.endTimeMs,
        visualEvents,
      );

      return {
        ...segment,
        speakerName: speaker,
        speakerType: SpeakerType.GUEST,
        confidence: 0.8,
      };
    });

    const allSegments = [...hostSegments, ...guestSegments].sort(
      (a, b) => a.startTimeMs - b.startTimeMs,
    );

    await this.saveSegments(meetingId, allSegments);

    // Generate summary
    await this.summarization.generateSummary(meetingId);

    await this.prisma.meetingRecording.update({
      where: { id: meetingId },
      data: {
        recordingStatus: RecordingStatus.COMPLETED,
        processingCompletedAt: new Date(),
      },
    });
  }

  /**
   * Merge Whisper transcript with Pyannote speaker labels
   * Match transcript segments to speaker segments by time overlap
   */
  private mergeTranscriptWithDiarization(
    transcript: any[],
    speakerSegments: any[],
  ): any[] {
    return transcript.map((textSegment) => {
      // Find overlapping speaker segment
      const matchingSpeaker = speakerSegments.find(
        (speakerSeg) =>
          speakerSeg.startMs <= textSegment.startTimeMs &&
          speakerSeg.endMs >= textSegment.startTimeMs,
      );

      if (matchingSpeaker) {
        return {
          ...textSegment,
          speakerName: matchingSpeaker.speakerName,
          speakerType: this.inferSpeakerType(matchingSpeaker.speakerName),
          confidence: matchingSpeaker.confidence,
        };
      }

      // No match - use default
      return {
        ...textSegment,
        speakerName: 'Unknown Speaker',
        speakerType: SpeakerType.UNKNOWN,
        confidence: 0.5,
      };
    });
  }

  /**
   * Infer speaker type from name (heuristic)
   */
  private inferSpeakerType(speakerName: string): SpeakerType {
    if (speakerName.includes('Host') || speakerName.includes('YOU')) {
      return SpeakerType.HOST;
    }
    if (speakerName.startsWith('Speaker ')) {
      return SpeakerType.UNKNOWN;
    }
    return SpeakerType.GUEST;
  }

  /**
   * Load speaker events from JSONL file
   */
  private async loadSpeakerEvents(
    eventsLogPath: string,
  ): Promise<SpeakerEvent[]> {
    const events: SpeakerEvent[] = [];

    try {
      const fileStream = createReadStream(eventsLogPath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line) as SpeakerEvent;
            events.push(event);
          } catch (error) {
            this.logger.warn(`Failed to parse event line: ${line}`);
          }
        }
      }

      return events;
    } catch (error) {
      this.logger.error('Failed to load speaker events:', error);
      return [];
    }
  }

  /**
   * Correlate speaker using visual events (old method for fallback)
   */
  private correlateSpeakerWithVisual(
    startTimeMs: number,
    endTimeMs: number,
    events: SpeakerEvent[],
  ): string {
    const relevantEvents = events.filter(
      (event) => event.ts >= startTimeMs && event.ts <= endTimeMs,
    );

    if (relevantEvents.length === 0) {
      return 'Unknown Guest';
    }

    const speakerCounts = new Map<string, number>();

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

  /**
   * Save diarized segments to database
   */
  private async saveSegments(
    meetingId: string,
    segments: any[],
  ): Promise<void> {
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
          audioSource: segment.audioSource || 'MONO_CHANNEL', // New pipeline uses mono
        })),
      });
    });
  }

  /**
   * Format transcript for summarization
   */
  private formatTranscriptForSummary(segments: any[]): string {
    return segments
      .map((segment) => {
        const timestamp = this.formatTimestamp(segment.startTimeMs);
        return `[${timestamp}] ${segment.speakerName}: ${segment.text}`;
      })
      .join('\n');
  }

  /**
   * Format milliseconds to timestamp
   */
  private formatTimestamp(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
