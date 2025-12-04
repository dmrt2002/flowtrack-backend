import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TranscriptSegment } from './transcription.service';
import { SpeakerType } from '@prisma/client';
import * as fs from 'fs/promises';
import * as readline from 'readline';
import { createReadStream } from 'fs';

interface SpeakerEvent {
  ts: number;
  speaker: string;
  state: string;
}

interface DiarizedSegment extends TranscriptSegment {
  speakerName: string;
  speakerType: SpeakerType;
  audioSource: 'HOST_CHANNEL' | 'GUEST_CHANNEL';
}

@Injectable()
export class DiarizationService {
  private readonly logger = new Logger(DiarizationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Merge transcripts with speaker events for diarization
   * This is the "Zero-Cost Diarization" algorithm from the spec
   */
  async diarizeTranscripts(
    meetingId: string,
    hostTranscript: TranscriptSegment[],
    guestTranscript: TranscriptSegment[],
    eventsLogPath: string,
  ): Promise<void> {
    try {
      this.logger.log(`Starting diarization for meeting: ${meetingId}`);

      // Load speaker events from JSONL file
      const speakerEvents = await this.loadSpeakerEvents(eventsLogPath);

      this.logger.log(`Loaded ${speakerEvents.length} speaker events`);

      // Step 1: Label host segments
      const hostSegments: DiarizedSegment[] = hostTranscript.map((segment) => ({
        ...segment,
        speakerName: 'YOU (Host)',
        speakerType: SpeakerType.HOST,
        audioSource: 'HOST_CHANNEL' as const,
      }));

      // Step 2: Label guest segments using visual correlation
      const guestSegments: DiarizedSegment[] = guestTranscript.map(
        (segment) => {
          const speaker = this.correlateSpeaker(
            segment.startTimeMs,
            segment.endTimeMs,
            speakerEvents,
          );

          return {
            ...segment,
            speakerName: speaker,
            speakerType: SpeakerType.GUEST,
            audioSource: 'GUEST_CHANNEL' as const,
          };
        },
      );

      // Step 3: Merge and sort by timestamp
      const allSegments = [...hostSegments, ...guestSegments].sort(
        (a, b) => a.startTimeMs - b.startTimeMs,
      );

      this.logger.log(`Diarization complete: ${allSegments.length} segments`);

      // Step 4: Save to database
      await this.saveSegments(meetingId, allSegments);

      this.logger.log(`Segments saved to database`);
    } catch (error) {
      this.logger.error('Failed to diarize transcripts:', error);
      throw error;
    }
  }

  /**
   * Correlate speaker using visual events (Voting Mechanism)
   */
  private correlateSpeaker(
    startTimeMs: number,
    endTimeMs: number,
    events: SpeakerEvent[],
  ): string {
    // Find events within the audio segment time window
    const relevantEvents = events.filter(
      (event) => event.ts >= startTimeMs && event.ts <= endTimeMs,
    );

    if (relevantEvents.length === 0) {
      return 'Unknown Guest';
    }

    // Voting mechanism: count frequency of each speaker
    const speakerCounts = new Map<string, number>();

    for (const event of relevantEvents) {
      const count = speakerCounts.get(event.speaker) || 0;
      speakerCounts.set(event.speaker, count + 1);
    }

    // Winner takes all: speaker with most events
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
      // Return empty array if file doesn't exist or can't be read
      return [];
    }
  }

  /**
   * Save diarized segments to database
   */
  private async saveSegments(
    meetingId: string,
    segments: DiarizedSegment[],
  ): Promise<void> {
    // Use transaction for atomic insert
    await this.prisma.$transaction(async (tx) => {
      // Delete existing segments (in case of re-processing)
      await tx.transcriptSegment.deleteMany({
        where: { meetingRecordingId: meetingId },
      });

      // Insert new segments
      await tx.transcriptSegment.createMany({
        data: segments.map((segment) => ({
          meetingRecordingId: meetingId,
          speakerName: segment.speakerName,
          speakerType: segment.speakerType,
          text: segment.text,
          startTimeMs: segment.startTimeMs,
          endTimeMs: segment.endTimeMs,
          confidence: segment.confidence,
          audioSource: segment.audioSource,
        })),
      });
    });
  }

  /**
   * Get unique speakers from a meeting
   */
  async getSpeakers(meetingId: string): Promise<string[]> {
    const segments = await this.prisma.transcriptSegment.findMany({
      where: { meetingRecordingId: meetingId },
      select: { speakerName: true },
      distinct: ['speakerName'],
    });

    return segments.map(
      (segment: { speakerName: string }) => segment.speakerName,
    );
  }

  /**
   * Format transcript for display or export
   */
  async formatTranscript(meetingId: string): Promise<string> {
    const segments = await this.prisma.transcriptSegment.findMany({
      where: { meetingRecordingId: meetingId },
      orderBy: { startTimeMs: 'asc' },
    });

    return segments
      .map(
        (segment: {
          startTimeMs: number;
          speakerName: string;
          text: string;
        }) => {
          const timestamp = this.formatTimestamp(segment.startTimeMs);
          return `[${timestamp}] ${segment.speakerName}: ${segment.text}`;
        },
      )
      .join('\n');
  }

  /**
   * Format milliseconds to timestamp string
   */
  private formatTimestamp(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
