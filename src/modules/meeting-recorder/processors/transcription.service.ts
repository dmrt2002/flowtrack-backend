import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface TranscriptSegment {
  startTimeMs: number;
  endTimeMs: number;
  text: string;
  confidence?: number;
}

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  /**
   * Transcribe audio file using Whisper
   * This implementation uses whisper.cpp via command line
   */
  async transcribe(audioPath: string): Promise<TranscriptSegment[]> {
    try {
      this.logger.log(`Transcribing audio: ${audioPath}`);

      // Check if whisper is available
      const hasWhisper = await this.checkWhisperInstalled();

      if (!hasWhisper) {
        this.logger.warn('Whisper not installed, using mock transcription');
        return this.mockTranscription();
      }

      const segments = await this.runWhisper(audioPath);

      this.logger.log(
        `Transcription completed: ${segments.length} segments`,
      );

      return segments;
    } catch (error) {
      this.logger.error('Failed to transcribe audio:', error);
      throw error;
    }
  }

  /**
   * Run Whisper transcription
   * Supports multiple whisper implementations
   */
  private async runWhisper(audioPath: string): Promise<TranscriptSegment[]> {
    // Try whisper.cpp first (fastest)
    if (await this.checkCommand('whisper-cpp')) {
      return this.runWhisperCpp(audioPath);
    }

    // Fall back to OpenAI Whisper Python
    if (await this.checkCommand('whisper')) {
      return this.runWhisperPython(audioPath);
    }

    throw new Error('No Whisper implementation found');
  }

  /**
   * Run whisper.cpp (recommended - fastest)
   */
  private async runWhisperCpp(audioPath: string): Promise<TranscriptSegment[]> {
    return new Promise((resolve, reject) => {
      const outputDir = path.dirname(audioPath);
      const outputFile = path.join(outputDir, 'transcript.json');

      // whisper.cpp command
      // Download model first: ./models/download-ggml-model.sh base.en
      const args = [
        '-m',
        'models/ggml-base.en.bin', // Model path (adjust as needed)
        '-f',
        audioPath,
        '-oj', // Output JSON
        '-of',
        path.join(outputDir, 'transcript'),
      ];

      const whisper = spawn('whisper-cpp', args);

      let stderr = '';

      whisper.stderr.on('data', (data) => {
        stderr += data.toString();
        this.logger.debug(data.toString());
      });

      whisper.on('close', async (code) => {
        if (code === 0) {
          try {
            const jsonContent = await fs.readFile(outputFile, 'utf-8');
            const data = JSON.parse(jsonContent);

            const segments: TranscriptSegment[] = data.transcription.map(
              (segment: any) => ({
                startTimeMs: Math.floor(segment.timestamps.from * 1000),
                endTimeMs: Math.floor(segment.timestamps.to * 1000),
                text: segment.text.trim(),
                confidence: segment.confidence,
              }),
            );

            resolve(segments);
          } catch (error) {
            reject(error);
          }
        } else {
          this.logger.error(`Whisper failed with code ${code}: ${stderr}`);
          reject(new Error(`Whisper failed with code ${code}`));
        }
      });

      whisper.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Run OpenAI Whisper Python implementation
   */
  private async runWhisperPython(
    audioPath: string,
  ): Promise<TranscriptSegment[]> {
    return new Promise((resolve, reject) => {
      const outputDir = path.dirname(audioPath);
      const outputFile = path.join(outputDir, 'transcript.json');

      // OpenAI Whisper command
      const args = [
        audioPath,
        '--model',
        'base.en', // Use English model for speed
        '--output_format',
        'json',
        '--output_dir',
        outputDir,
        '--language',
        'en',
      ];

      const whisper = spawn('whisper', args);

      let stderr = '';

      whisper.stderr.on('data', (data) => {
        stderr += data.toString();
        this.logger.debug(data.toString());
      });

      whisper.on('close', async (code) => {
        if (code === 0) {
          try {
            const jsonContent = await fs.readFile(outputFile, 'utf-8');
            const data = JSON.parse(jsonContent);

            const segments: TranscriptSegment[] = data.segments.map(
              (segment: any) => ({
                startTimeMs: Math.floor(segment.start * 1000),
                endTimeMs: Math.floor(segment.end * 1000),
                text: segment.text.trim(),
                confidence: segment.avg_logprob
                  ? Math.exp(segment.avg_logprob)
                  : undefined,
              }),
            );

            resolve(segments);
          } catch (error) {
            reject(error);
          }
        } else {
          this.logger.error(`Whisper failed with code ${code}: ${stderr}`);
          reject(new Error(`Whisper failed with code ${code}`));
        }
      });

      whisper.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Check if a command is available
   */
  private async checkCommand(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(command, ['--version']);

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Check if Whisper is installed
   */
  async checkWhisperInstalled(): Promise<boolean> {
    const hasCpp = await this.checkCommand('whisper-cpp');
    const hasPython = await this.checkCommand('whisper');
    return hasCpp || hasPython;
  }

  /**
   * Mock transcription for development/testing
   */
  private mockTranscription(): TranscriptSegment[] {
    return [
      {
        startTimeMs: 0,
        endTimeMs: 3000,
        text: 'Hello, this is a mock transcription.',
        confidence: 0.95,
      },
      {
        startTimeMs: 3000,
        endTimeMs: 6000,
        text: 'Whisper is not installed, so this is placeholder text.',
        confidence: 0.95,
      },
      {
        startTimeMs: 6000,
        endTimeMs: 9000,
        text: 'Install whisper.cpp or OpenAI Whisper for real transcription.',
        confidence: 0.95,
      },
    ];
  }
}
