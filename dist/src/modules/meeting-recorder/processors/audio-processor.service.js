"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var AudioProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioProcessorService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
let AudioProcessorService = AudioProcessorService_1 = class AudioProcessorService {
    logger = new common_1.Logger(AudioProcessorService_1.name);
    async splitStereoAudio(stereoAudioPath, outputDir) {
        try {
            const hostAudioPath = path.join(outputDir, 'host.wav');
            const guestAudioPath = path.join(outputDir, 'guests.wav');
            this.logger.log(`Splitting audio: ${stereoAudioPath}`);
            await Promise.all([
                this.extractChannel(stereoAudioPath, hostAudioPath, 1),
                this.extractChannel(stereoAudioPath, guestAudioPath, 0),
            ]);
            this.logger.log('Audio split completed successfully');
            return {
                hostAudioPath,
                guestAudioPath,
            };
        }
        catch (error) {
            this.logger.error('Failed to split audio:', error);
            throw error;
        }
    }
    extractChannel(inputPath, outputPath, channel) {
        return new Promise((resolve, reject) => {
            const args = [
                '-i',
                inputPath,
                '-map_channel',
                `0.0.${channel}`,
                '-ar',
                '16000',
                '-ac',
                '1',
                '-c:a',
                'pcm_s16le',
                '-y',
                outputPath,
            ];
            this.logger.log(`FFmpeg command: ffmpeg ${args.join(' ')}`);
            const ffmpeg = (0, child_process_1.spawn)('ffmpeg', args);
            let stderr = '';
            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    this.logger.log(`Channel ${channel} extracted successfully`);
                    resolve();
                }
                else {
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
    async getAudioDuration(audioPath) {
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
            const ffprobe = (0, child_process_1.spawn)('ffprobe', args);
            let stdout = '';
            ffprobe.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            ffprobe.on('close', (code) => {
                if (code === 0) {
                    const duration = parseFloat(stdout.trim());
                    resolve(duration);
                }
                else {
                    reject(new Error('Failed to get audio duration'));
                }
            });
            ffprobe.on('error', (error) => {
                reject(error);
            });
        });
    }
    async convertToWhisperFormat(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            const args = [
                '-i',
                inputPath,
                '-ar',
                '16000',
                '-ac',
                '1',
                '-c:a',
                'pcm_s16le',
                '-y',
                outputPath,
            ];
            const ffmpeg = (0, child_process_1.spawn)('ffmpeg', args);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`FFmpeg failed with code ${code}`));
                }
            });
            ffmpeg.on('error', (error) => {
                reject(error);
            });
        });
    }
    async convertStereoToIntelligentMono(stereoPath, outputPath) {
        return new Promise((resolve, reject) => {
            this.logger.log(`Converting stereo to intelligent mono: ${stereoPath}`);
            const args = [
                '-i',
                stereoPath,
                '-af',
                'pan=mono|c0=0.7*c0+0.3*c1',
                '-ar',
                '16000',
                '-ac',
                '1',
                '-c:a',
                'pcm_s16le',
                '-y',
                outputPath,
            ];
            this.logger.log(`FFmpeg command: ffmpeg ${args.join(' ')}`);
            const ffmpeg = (0, child_process_1.spawn)('ffmpeg', args);
            let stderr = '';
            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    this.logger.log('Intelligent mono conversion completed');
                    resolve();
                }
                else {
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
    async removeEchoWithSidechain(stereoPath, outputPath) {
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
                '2',
                '-c:a',
                'pcm_s16le',
                '-y',
                outputPath,
            ];
            this.logger.log(`FFmpeg command: ffmpeg ${args.join(' ')}`);
            const ffmpeg = (0, child_process_1.spawn)('ffmpeg', args);
            let stderr = '';
            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    this.logger.log('Echo removal completed');
                    resolve();
                }
                else {
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
    async checkFFmpegInstalled() {
        return new Promise((resolve) => {
            const ffmpeg = (0, child_process_1.spawn)('ffmpeg', ['-version']);
            ffmpeg.on('close', (code) => {
                resolve(code === 0);
            });
            ffmpeg.on('error', () => {
                resolve(false);
            });
        });
    }
};
exports.AudioProcessorService = AudioProcessorService;
exports.AudioProcessorService = AudioProcessorService = AudioProcessorService_1 = __decorate([
    (0, common_1.Injectable)()
], AudioProcessorService);
//# sourceMappingURL=audio-processor.service.js.map