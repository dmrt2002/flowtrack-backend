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
var TranscriptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
let TranscriptionService = TranscriptionService_1 = class TranscriptionService {
    logger = new common_1.Logger(TranscriptionService_1.name);
    async transcribe(audioPath) {
        try {
            this.logger.log(`Transcribing audio: ${audioPath}`);
            const hasWhisper = await this.checkWhisperInstalled();
            if (!hasWhisper) {
                this.logger.warn('Whisper not installed, using mock transcription');
                return this.mockTranscription();
            }
            const segments = await this.runWhisper(audioPath);
            this.logger.log(`Transcription completed: ${segments.length} segments`);
            return segments;
        }
        catch (error) {
            this.logger.error('Failed to transcribe audio:', error);
            throw error;
        }
    }
    async runWhisper(audioPath) {
        if (await this.checkCommand('whisper-cpp')) {
            return this.runWhisperCpp(audioPath);
        }
        if (await this.checkCommand('whisper')) {
            return this.runWhisperPython(audioPath);
        }
        throw new Error('No Whisper implementation found');
    }
    async runWhisperCpp(audioPath) {
        return new Promise((resolve, reject) => {
            const outputDir = path.dirname(audioPath);
            const outputFile = path.join(outputDir, 'transcript.json');
            const args = [
                '-m',
                'models/ggml-base.en.bin',
                '-f',
                audioPath,
                '-oj',
                '-of',
                path.join(outputDir, 'transcript'),
            ];
            const whisper = (0, child_process_1.spawn)('whisper-cpp', args);
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
                        const segments = data.transcription.map((segment) => ({
                            startTimeMs: Math.floor(segment.timestamps.from * 1000),
                            endTimeMs: Math.floor(segment.timestamps.to * 1000),
                            text: segment.text.trim(),
                            confidence: segment.confidence,
                        }));
                        resolve(segments);
                    }
                    catch (error) {
                        reject(error);
                    }
                }
                else {
                    this.logger.error(`Whisper failed with code ${code}: ${stderr}`);
                    reject(new Error(`Whisper failed with code ${code}`));
                }
            });
            whisper.on('error', (error) => {
                reject(error);
            });
        });
    }
    async runWhisperPython(audioPath) {
        return new Promise((resolve, reject) => {
            const outputDir = path.dirname(audioPath);
            const outputFile = path.join(outputDir, 'transcript.json');
            const args = [
                audioPath,
                '--model',
                'base.en',
                '--output_format',
                'json',
                '--output_dir',
                outputDir,
                '--language',
                'en',
            ];
            const whisper = (0, child_process_1.spawn)('whisper', args);
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
                        const segments = data.segments.map((segment) => ({
                            startTimeMs: Math.floor(segment.start * 1000),
                            endTimeMs: Math.floor(segment.end * 1000),
                            text: segment.text.trim(),
                            confidence: segment.avg_logprob
                                ? Math.exp(segment.avg_logprob)
                                : undefined,
                        }));
                        resolve(segments);
                    }
                    catch (error) {
                        reject(error);
                    }
                }
                else {
                    this.logger.error(`Whisper failed with code ${code}: ${stderr}`);
                    reject(new Error(`Whisper failed with code ${code}`));
                }
            });
            whisper.on('error', (error) => {
                reject(error);
            });
        });
    }
    async checkCommand(command) {
        return new Promise((resolve) => {
            const child = (0, child_process_1.spawn)(command, ['--version']);
            child.on('close', (code) => {
                resolve(code === 0);
            });
            child.on('error', () => {
                resolve(false);
            });
        });
    }
    async checkWhisperInstalled() {
        const hasCpp = await this.checkCommand('whisper-cpp');
        const hasPython = await this.checkCommand('whisper');
        return hasCpp || hasPython;
    }
    mockTranscription() {
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
};
exports.TranscriptionService = TranscriptionService;
exports.TranscriptionService = TranscriptionService = TranscriptionService_1 = __decorate([
    (0, common_1.Injectable)()
], TranscriptionService);
//# sourceMappingURL=transcription.service.js.map