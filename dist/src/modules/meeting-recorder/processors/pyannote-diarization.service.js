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
var PyannoteDiarizationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PyannoteDiarizationService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
let PyannoteDiarizationService = PyannoteDiarizationService_1 = class PyannoteDiarizationService {
    logger = new common_1.Logger(PyannoteDiarizationService_1.name);
    async diarize(audioPath, numSpeakers) {
        return new Promise((resolve, reject) => {
            this.logger.log(`Starting Pyannote diarization: ${audioPath}`);
            const scriptPath = path.join(__dirname, '../../../../scripts/diarize_pyannote.py');
            const args = [scriptPath, audioPath];
            if (numSpeakers) {
                args.push(numSpeakers.toString());
            }
            const python = (0, child_process_1.spawn)('python3', args, {
                env: {
                    ...process.env,
                },
            });
            const segments = [];
            let stdout = '';
            let stderr = '';
            python.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            python.stderr.on('data', (data) => {
                const line = data.toString();
                stderr += line;
                try {
                    const status = JSON.parse(line);
                    if (status.status) {
                        this.logger.log(`Pyannote: ${status.message || status.status}`);
                    }
                }
                catch {
                    this.logger.debug(`Pyannote stderr: ${line.trim()}`);
                }
            });
            python.on('close', (code) => {
                if (code === 0) {
                    const lines = stdout.trim().split('\n');
                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const segment = JSON.parse(line);
                                segments.push(segment);
                            }
                            catch (error) {
                                this.logger.warn(`Failed to parse segment: ${line}`);
                            }
                        }
                    }
                    this.logger.log(`Pyannote completed: ${segments.length} segments found`);
                    resolve(segments);
                }
                else {
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
    async enhanceWithVisualEvents(aiSegments, visualEvents) {
        this.logger.log(`Enhancing ${aiSegments.length} AI segments with ${visualEvents.length} visual events`);
        const speakerNameMap = new Map();
        const uniqueSpeakers = [...new Set(aiSegments.map((s) => s.speaker))];
        for (const aiSpeaker of uniqueSpeakers) {
            const speakerSegments = aiSegments.filter((s) => s.speaker === aiSpeaker);
            const matchingEvents = [];
            for (const segment of speakerSegments) {
                const segmentEvents = visualEvents.filter((event) => event.ts >= segment.startMs && event.ts <= segment.endMs);
                matchingEvents.push(...segmentEvents);
            }
            const nameCounts = new Map();
            for (const event of matchingEvents) {
                const count = nameCounts.get(event.speaker) || 0;
                nameCounts.set(event.speaker, count + 1);
            }
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
                this.logger.log(`Mapped ${aiSpeaker} → ${bestName} (${maxCount} visual events)`);
            }
        }
        const enhanced = aiSegments.map((segment) => {
            const visualName = speakerNameMap.get(segment.speaker);
            if (visualName) {
                return {
                    ...segment,
                    speakerName: visualName,
                    confidence: 0.95,
                    source: 'visual',
                };
            }
            else {
                const speakerNum = segment.speaker.replace('SPEAKER_', '');
                return {
                    ...segment,
                    speakerName: `Speaker ${speakerNum}`,
                    confidence: 0.70,
                    source: 'ai',
                };
            }
        });
        this.logger.log(`Enhanced segments created: ${enhanced.length}`);
        return enhanced;
    }
    async checkPyannoteAvailable() {
        return new Promise((resolve) => {
            const python = (0, child_process_1.spawn)('python3', ['-c', 'import pyannote.audio']);
            python.on('close', (code) => {
                resolve(code === 0);
            });
            python.on('error', () => {
                resolve(false);
            });
        });
    }
    getInstallationInstructions() {
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
};
exports.PyannoteDiarizationService = PyannoteDiarizationService;
exports.PyannoteDiarizationService = PyannoteDiarizationService = PyannoteDiarizationService_1 = __decorate([
    (0, common_1.Injectable)()
], PyannoteDiarizationService);
//# sourceMappingURL=pyannote-diarization.service.js.map