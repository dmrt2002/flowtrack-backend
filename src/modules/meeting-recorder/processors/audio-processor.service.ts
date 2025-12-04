import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface AudioSplitResult {
  hostAudioPath: string;
  guestAudioPath: string;
}

@Injectable()
export class AudioProcessorService {
  private readonly logger = new Logger(AudioProcessorService.name);

  /**
   * Split stereo audio file into two mono channels
   * Left Channel (0) → Guests
   * Right Channel (1) → Host
   */
  async splitStereoAudio(
    stereoAudioPath: string,
    outputDir: string,
  ): Promise<AudioSplitResult> {
    try {
      const hostAudioPath = path.join(outputDir, 'host.wav');
      const guestAudioPath = path.join(outputDir, 'guests.wav');

      this.logger.log(`Splitting audio: ${stereoAudioPath}`);

      // Split channels in parallel
      await Promise.all([
        this.extractChannel(stereoAudioPath, hostAudioPath, 1), // Right channel
        this.extractChannel(stereoAudioPath, guestAudioPath, 0), // Left channel
      ]);

      this.logger.log('Audio split completed successfully');

      return {
        hostAudioPath,
        guestAudioPath,
      };
    } catch (error) {
      this.logger.error('Failed to split audio:', error);
      throw error;
    }
  }

  /**
   * Extract a specific channel from stereo audio
   */
  private extractChannel(
    inputPath: string,
    outputPath: string,
    channel: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i',
        inputPath, // Input file
        '-map_channel',
        `0.0.${channel}`, // Extract channel
        '-ar',
        '16000', // Sample rate: 16kHz (Whisper requirement)
        '-ac',
        '1', // Mono output
        '-c:a',
        'pcm_s16le', // PCM 16-bit format
        '-y', // Overwrite output file
        outputPath,
      ];

      this.logger.log(`FFmpeg command: ffmpeg ${args.join(' ')}`);

      const ffmpeg = spawn('ffmpeg', args);

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          this.logger.log(`Channel ${channel} extracted successfully`);
          resolve();
        } else {
          this.logger.error(`FFmpeg failed with code ${code}: ${stderr}`);
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        this.logger.error('FFmpeg spawn error:', error);
        reject(error);
      });
    });
  }

  /**
   * Get audio file duration in seconds
   */
  async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i',
        audioPath,
        '-show_entries',
        'format=duration',
        '-v',
        'quiet',
        '-of',
        'csv=p=0',
      ];

      const ffprobe = spawn('ffprobe', args);

      let stdout = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          const duration = parseFloat(stdout.trim());
          resolve(duration);
        } else {
          reject(new Error('Failed to get audio duration'));
        }
      });

      ffprobe.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Convert audio to format suitable for Whisper
   */
  async convertToWhisperFormat(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i',
        inputPath,
        '-ar',
        '16000', // 16kHz sample rate
        '-ac',
        '1', // Mono
        '-c:a',
        'pcm_s16le', // PCM 16-bit
        '-y',
        outputPath,
      ];

      const ffmpeg = spawn('ffmpeg', args);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Convert stereo to intelligent mono with weighted mixing
   * This reduces echo by mixing: 70% LEFT (all voices) + 30% RIGHT (host clear)
   * Result: Balanced mono with minimal voice duplication
   */
  async convertStereoToIntelligentMono(
    stereoPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.log(`Converting stereo to intelligent mono: ${stereoPath}`);

      const args = [
        '-i',
        stereoPath,
        '-af',
        'pan=mono|c0=0.7*c0+0.3*c1', // 70% left + 30% right
        '-ar',
        '16000', // 16kHz for Whisper
        '-ac',
        '1', // Mono output
        '-c:a',
        'pcm_s16le', // PCM 16-bit
        '-y',
        outputPath,
      ];

      this.logger.log(`FFmpeg command: ffmpeg ${args.join(' ')}`);

      const ffmpeg = spawn('ffmpeg', args);

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          this.logger.log('Intelligent mono conversion completed');
          resolve();
        } else {
          this.logger.error(`FFmpeg failed with code ${code}: ${stderr}`);
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        this.logger.error('FFmpeg spawn error:', error);
        reject(error);
      });
    });
  }

  /**
   * Alternative: Remove echo using sidechain compression
   * Subtracts RIGHT channel (host) from LEFT channel (guests+host)
   * More aggressive but may introduce artifacts
   */
  async removeEchoWithSidechain(
    stereoPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.log(`Removing echo with sidechain: ${stereoPath}`);

      const args = [
        '-i',
        stereoPath,
        '-filter_complex',
        [
          '[0:a]channelsplit=channel_layout=stereo[left][right]',
          '[right]volume=0.5[right_reduced]',
          '[left][right_reduced]sidechaincompress=threshold=0.1:ratio=10:attack=10:release=100[guests_only]',
          '[guests_only][right]amerge=inputs=2[out]',
        ].join(';'),
        '-map',
        '[out]',
        '-ar',
        '16000',
        '-ac',
        '2', // Keep stereo
        '-c:a',
        'pcm_s16le',
        '-y',
        outputPath,
      ];

      this.logger.log(`FFmpeg command: ffmpeg ${args.join(' ')}`);

      const ffmpeg = spawn('ffmpeg', args);

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          this.logger.log('Echo removal completed');
          resolve();
        } else {
          this.logger.error(`FFmpeg failed with code ${code}: ${stderr}`);
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        this.logger.error('FFmpeg spawn error:', error);
        reject(error);
      });
    });
  }

  /**
   * Check if FFmpeg is installed
   */
  async checkFFmpegInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version']);

      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });

      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  }
}
