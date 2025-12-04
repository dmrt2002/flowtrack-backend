import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordingStatus } from '@prisma/client';
import { StartSessionDto } from './dto/start-session.dto';
import { SpeakerEventDto } from './dto/speaker-event.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream, WriteStream } from 'fs';

interface RecordingSession {
  meetingId: string;
  workspaceId: string;
  audioStream: WriteStream;
  eventsStream: WriteStream;
  audioPath: string;
  eventsPath: string;
  createdAt: Date;
}

@Injectable()
export class MeetingRecorderService {
  private readonly logger = new Logger(MeetingRecorderService.name);
  private readonly sessions = new Map<string, RecordingSession>();
  private readonly storageDir: string;

  constructor(private prisma: PrismaService) {
    // Initialize storage directory
    this.storageDir = path.join(process.cwd(), 'storage', 'meetings');
    this.initializeStorage();
  }

  /**
   * Initialize storage directory
   */
  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      this.logger.log(`Storage directory initialized: ${this.storageDir}`);
    } catch (error) {
      this.logger.error('Failed to initialize storage directory:', error);
    }
  }

  /**
   * Start a new recording session
   */
  async startSession(payload: StartSessionDto): Promise<string> {
    try {
      // Get workspace ID or find the first workspace for testing
      let workspaceId: string = payload.workspaceId || '';

      // If workspaceId is 'default' or empty, find the first workspace
      if (!workspaceId || workspaceId === 'default') {
        const workspace = await this.prisma.workspace.findFirst();
        if (workspace) {
          workspaceId = workspace.id;
          this.logger.log(`Using first workspace for testing: ${workspaceId}`);
        } else {
          throw new Error('No workspace found. Please create a workspace first.');
        }
      }

      // Create meeting recording in database
      const meeting = await this.prisma.meetingRecording.create({
        data: {
          workspaceId: workspaceId,
          leadId: payload.leadId || null,
          meetingTitle: payload.meetingTitle || null,
          meetingPlatform: payload.platform,
          meetingUrl: payload.meetingUrl || null,
          recordingStatus: RecordingStatus.RECORDING,
          recordingStartedAt: new Date(),
        },
      });

      // Create session directory
      const sessionDir = path.join(this.storageDir, meeting.id);
      await fs.mkdir(sessionDir, { recursive: true });

      // Create file paths
      const audioPath = path.join(sessionDir, 'audio.webm');
      const eventsPath = path.join(sessionDir, 'events.jsonl');

      // Create write streams
      const audioStream = createWriteStream(audioPath, { flags: 'a' });
      const eventsStream = createWriteStream(eventsPath, { flags: 'a' });

      // Store session
      this.sessions.set(meeting.id, {
        meetingId: meeting.id,
        workspaceId: workspaceId, // Use the resolved workspaceId, not payload
        audioStream,
        eventsStream,
        audioPath,
        eventsPath,
        createdAt: new Date(),
      });

      this.logger.log(`Recording session started: ${meeting.id}`);

      return meeting.id;
    } catch (error) {
      this.logger.error('Failed to start recording session:', error);
      throw error;
    }
  }

  /**
   * Write audio chunk to file
   */
  async writeAudioChunk(meetingId: string, chunk: Buffer): Promise<void> {
    const session = this.sessions.get(meetingId);

    if (!session) {
      throw new Error(`Session not found: ${meetingId}`);
    }

    return new Promise((resolve, reject) => {
      // Monitor backpressure
      const canWrite = session.audioStream.write(chunk);

      if (!canWrite) {
        // Wait for drain event if stream is full
        session.audioStream.once('drain', () => {
          resolve();
        });
      } else {
        resolve();
      }

      session.audioStream.once('error', (error) => {
        this.logger.error(`Audio stream error for ${meetingId}:`, error);
        reject(error);
      });
    });
  }

  /**
   * Write speaker event to log
   */
  async writeSpeakerEvent(
    meetingId: string,
    event: SpeakerEventDto,
  ): Promise<void> {
    const session = this.sessions.get(meetingId);

    if (!session) {
      throw new Error(`Session not found: ${meetingId}`);
    }

    return new Promise((resolve, reject) => {
      const line = JSON.stringify({
        ts: event.timestamp,
        speaker: event.speakerName,
        state: event.state,
      });

      session.eventsStream.write(line + '\n', (error) => {
        if (error) {
          this.logger.error(`Events stream error for ${meetingId}:`, error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * End recording session
   */
  async endSession(meetingId: string): Promise<void> {
    const session = this.sessions.get(meetingId);

    if (!session) {
      this.logger.warn(`Session not found: ${meetingId}`);
      return;
    }

    try {
      // Close streams
      await this.closeStream(session.audioStream);
      await this.closeStream(session.eventsStream);

      // Calculate file size
      const stats = await fs.stat(session.audioPath);
      const fileSizeBytes = BigInt(stats.size);

      // Calculate duration
      const durationMs = Date.now() - session.createdAt.getTime();
      const durationSeconds = Math.floor(durationMs / 1000);

      // Update database
      await this.prisma.meetingRecording.update({
        where: { id: meetingId },
        data: {
          recordingEndedAt: new Date(),
          recordingStatus: RecordingStatus.PROCESSING,
          stereoAudioPath: path.relative(this.storageDir, session.audioPath),
          eventsLogPath: path.relative(this.storageDir, session.eventsPath),
          durationSeconds,
          fileSizeBytes,
        },
      });

      // Remove session from memory
      this.sessions.delete(meetingId);

      this.logger.log(`Recording session ended: ${meetingId}`);

      this.logger.log(`🚀 Triggering post-processing for: ${meetingId}`);

      // Note: In production, this should be added to a BullMQ queue
      // For now, we'll process synchronously (can take 1-5 minutes)
      // TODO: Move to background queue for production
    } catch (error) {
      this.logger.error(`Failed to end session ${meetingId}:`, error);

      // Mark as failed
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
   * Close write stream gracefully
   */
  private closeStream(stream: WriteStream): Promise<void> {
    return new Promise((resolve) => {
      if (stream.closed) {
        resolve();
        return;
      }

      stream.end(() => {
        resolve();
      });
    });
  }

  /**
   * Get recording by ID
   */
  async getRecording(meetingId: string) {
    return this.prisma.meetingRecording.findUnique({
      where: { id: meetingId },
      include: {
        transcriptSegments: {
          orderBy: { startTimeMs: 'asc' },
        },
        meetingSummary: true,
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * List recordings for workspace
   */
  async listRecordings(workspaceId: string, limit = 50, offset = 0) {
    return this.prisma.meetingRecording.findMany({
      where: { workspaceId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            transcriptSegments: true,
          },
        },
      },
      orderBy: { recordingStartedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Delete recording
   */
  async deleteRecording(meetingId: string): Promise<void> {
    const recording = await this.prisma.meetingRecording.findUnique({
      where: { id: meetingId },
    });

    if (!recording) {
      throw new Error('Recording not found');
    }

    // Delete files
    const sessionDir = path.join(this.storageDir, meetingId);
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (error) {
      this.logger.warn(`Failed to delete files for ${meetingId}:`, error);
    }

    // Delete from database
    await this.prisma.meetingRecording.delete({
      where: { id: meetingId },
    });

    this.logger.log(`Recording deleted: ${meetingId}`);
  }
}
