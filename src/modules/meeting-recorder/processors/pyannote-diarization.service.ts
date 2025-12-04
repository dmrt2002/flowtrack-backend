import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';

export interface PyannoteSpeakerSegment {
  start: number; // Start time in seconds
  end: number; // End time in seconds
  duration: number; // Duration in seconds
  speaker: string; // e.g., "SPEAKER_00", "SPEAKER_01"
  startMs: number; // Start time in milliseconds
  endMs: number; // End time in milliseconds
}

interface SpeakerEvent {
  ts: number;
  speaker: string;
  state: string;
}

export interface EnhancedSpeakerSegment extends PyannoteSpeakerSegment {
  speakerName: string; // Actual name from visual events or "Speaker 0"
  confidence: number; // 0.95 if matched with visual, 0.70 if not
  source: 'visual' | 'ai'; // Where the speaker name came from
}

@Injectable()
export class PyannoteDiarizationService {
  private readonly logger = new Logger(PyannoteDiarizationService.name);

  /**
   * Run Pyannote speaker diarization on audio file
   */
  async diarize(
    audioPath: string,
    numSpeakers?: number,
  ): Promise<PyannoteSpeakerSegment[]> {
    return new Promise((resolve, reject) => {
      this.logger.log(`Starting Pyannote diarization: ${audioPath}`);

      const scriptPath = path.join(
        __dirname,
        '../../../../scripts/diarize_pyannote.py',
      );

      const args = [scriptPath, audioPath];
      if (numSpeakers) {
        args.push(numSpeakers.toString());
      }

      const python = spawn('python3', args, {
        env: {
          ...process.env,
          // HuggingFace token should be in .env as HUGGINGFACE_TOKEN
        },
      });

      const segments: PyannoteSpeakerSegment[] = [];
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        const line = data.toString();
        stderr += line;

        // Parse status messages from stderr
        try {
          const status = JSON.parse(line);
          if (status.status) {
            this.logger.log(`Pyannote: ${status.message || status.status}`);
          }
        } catch {
          // Not JSON, just log as-is
          this.logger.debug(`Pyannote stderr: ${line.trim()}`);
        }
      });

      python.on('close', (code) => {
        if (code === 0) {
          // Parse JSONL output (one segment per line)
          const lines = stdout.trim().split('\n');

          for (const line of lines) {
            if (line.trim()) {
              try {
                const segment = JSON.parse(line) as PyannoteSpeakerSegment;
                segments.push(segment);
              } catch (error) {
                this.logger.warn(`Failed to parse segment: ${line}`);
              }
            }
          }

          this.logger.log(
            `Pyannote completed: ${segments.length} segments found`,
          );
          resolve(segments);
        } else {
          this.logger.error(`Pyannote failed with code ${code}: ${stderr}`);
          reject(new Error(`Pyannote diarization failed with code ${code}`));
        }
      });

      python.on('error', (error) => {
        this.logger.error('Failed to spawn Python process:', error);
        reject(error);
      });
    });
  }

  /**
   * Enhance AI-generated segments with visual speaker events
   * Maps AI speaker labels (SPEAKER_00, SPEAKER_01) to actual names
   */
  async enhanceWithVisualEvents(
    aiSegments: PyannoteSpeakerSegment[],
    visualEvents: SpeakerEvent[],
  ): Promise<EnhancedSpeakerSegment[]> {
    this.logger.log(
      `Enhancing ${aiSegments.length} AI segments with ${visualEvents.length} visual events`,
    );

    // Build a mapping: AI speaker label → actual person name
    const speakerNameMap = new Map<string, string>();

    // For each AI-identified speaker, find their most likely name from visual events
    const uniqueSpeakers = [...new Set(aiSegments.map((s) => s.speaker))];

    for (const aiSpeaker of uniqueSpeakers) {
      // Get all segments for this AI speaker
      const speakerSegments = aiSegments.filter(
        (s) => s.speaker === aiSpeaker,
      );

      // Find visual events that overlap with this speaker's segments
      const matchingEvents: SpeakerEvent[] = [];

      for (const segment of speakerSegments) {
        const segmentEvents = visualEvents.filter(
          (event) => event.ts >= segment.startMs && event.ts <= segment.endMs,
        );
        matchingEvents.push(...segmentEvents);
      }

      // Count frequency of each visual speaker name
      const nameCounts = new Map<string, number>();

      for (const event of matchingEvents) {
        const count = nameCounts.get(event.speaker) || 0;
        nameCounts.set(event.speaker, count + 1);
      }

      // Most frequent name wins
      let maxCount = 0;
      let bestName = '';

      for (const [name, count] of nameCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestName = name;
        }
      }

      if (bestName) {
        speakerNameMap.set(aiSpeaker, bestName);
        this.logger.log(
          `Mapped ${aiSpeaker} → ${bestName} (${maxCount} visual events)`,
        );
      }
    }

    // Apply mapping to all segments
    const enhanced: EnhancedSpeakerSegment[] = aiSegments.map((segment) => {
      const visualName = speakerNameMap.get(segment.speaker);

      if (visualName) {
        return {
          ...segment,
          speakerName: visualName,
          confidence: 0.95, // High confidence when matched with visual
          source: 'visual' as const,
        };
      } else {
        // Fallback: use AI label as-is
        // Convert "SPEAKER_00" → "Speaker 0" for better readability
        const speakerNum = segment.speaker.replace('SPEAKER_', '');
        return {
          ...segment,
          speakerName: `Speaker ${speakerNum}`,
          confidence: 0.70, // Lower confidence without visual confirmation
          source: 'ai' as const,
        };
      }
    });

    this.logger.log(`Enhanced segments created: ${enhanced.length}`);

    return enhanced;
  }

  /**
   * Check if Pyannote is available (Python + dependencies installed)
   */
  async checkPyannoteAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const python = spawn('python3', ['-c', 'import pyannote.audio']);

      python.on('close', (code) => {
        resolve(code === 0);
      });

      python.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get installation instructions if Pyannote not available
   */
  getInstallationInstructions(): string {
    return `
Pyannote is not installed. To enable AI-powered speaker diarization:

1. Install Python dependencies:
   cd backend/scripts
   pip install -r requirements.txt

2. Get HuggingFace token (free):
   - Visit: https://huggingface.co/settings/tokens
   - Create new token with "Read" permission
   - Accept model terms: https://huggingface.co/pyannote/speaker-diarization-3.1

3. Add to .env file:
   HUGGINGFACE_TOKEN=your_token_here

4. First run will download ~2GB model (one-time only)
`;
  }
}
