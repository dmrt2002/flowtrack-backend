"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MeetingRecorderGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingRecorderGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const meeting_recorder_service_1 = require("./meeting-recorder.service");
const start_session_dto_1 = require("./dto/start-session.dto");
const speaker_event_dto_1 = require("./dto/speaker-event.dto");
const end_session_dto_1 = require("./dto/end-session.dto");
let MeetingRecorderGateway = MeetingRecorderGateway_1 = class MeetingRecorderGateway {
    meetingRecorderService;
    server;
    logger = new common_1.Logger(MeetingRecorderGateway_1.name);
    clientSessions = new Map();
    constructor(meetingRecorderService) {
        this.meetingRecorderService = meetingRecorderService;
    }
    async handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
        this.clientSessions.set(client.id, {
            meetingId: null,
            workspaceId: null,
            connectedAt: new Date(),
        });
        client.onAny((event, ...args) => {
            if (event === 'AUDIO_CHUNK') {
                this.handleAudioChunkDirect(client, args[0]);
            }
        });
        client.emit('connected', {
            clientId: client.id,
            timestamp: Date.now(),
        });
    }
    async handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const session = this.clientSessions.get(client.id);
        if (session?.meetingId) {
            try {
                await this.meetingRecorderService.endSession(session.meetingId);
                this.logger.log(`Auto-ended session ${session.meetingId} on disconnect`);
            }
            catch (error) {
                this.logger.error(`Failed to auto-end session:`, error);
            }
        }
        this.clientSessions.delete(client.id);
    }
    async handleStartSession(payload, client) {
        try {
            this.logger.log(`Start session request from ${client.id}: ${payload.workspaceId}`);
            const meetingId = await this.meetingRecorderService.startSession(payload);
            const session = this.clientSessions.get(client.id);
            if (session) {
                session.meetingId = meetingId;
                session.workspaceId = payload.workspaceId || null;
            }
            client.emit('SESSION_STARTED', {
                meetingId,
                timestamp: Date.now(),
            });
            this.logger.log(`Session started: ${meetingId}`);
        }
        catch (error) {
            this.logger.error('Failed to start session:', error);
            client.emit('SESSION_ERROR', {
                error: error.message,
                timestamp: Date.now(),
            });
        }
    }
    async handleAudioChunkDirect(client, data) {
        const session = this.clientSessions.get(client.id);
        if (!session?.meetingId) {
            this.logger.warn(`Audio chunk received without active session: ${client.id}`);
            return;
        }
        try {
            this.logger.debug(`Received data type: ${typeof data}, isBuffer: ${Buffer.isBuffer(data)}, constructor: ${data?.constructor?.name}`);
            let buffer;
            if (Buffer.isBuffer(data)) {
                buffer = data;
            }
            else if (data instanceof ArrayBuffer) {
                buffer = Buffer.from(data);
            }
            else if (data instanceof Uint8Array || data instanceof Int8Array) {
                buffer = Buffer.from(data);
            }
            else if (typeof data === 'object' && data.type === 'Buffer' && Array.isArray(data.data)) {
                buffer = Buffer.from(data.data);
            }
            else {
                this.logger.error(`Unsupported audio chunk format: ${typeof data}, keys: ${Object.keys(data || {}).slice(0, 5)}`);
                return;
            }
            await this.meetingRecorderService.writeAudioChunk(session.meetingId, buffer);
        }
        catch (error) {
            this.logger.error(`Failed to write audio chunk for ${session.meetingId}:`, error);
        }
    }
    async handleAudioChunk(data, client) {
        const session = this.clientSessions.get(client.id);
        if (!session?.meetingId) {
            this.logger.warn(`Audio chunk received without active session: ${client.id}`);
            return;
        }
        try {
            let buffer;
            if (Buffer.isBuffer(data)) {
                buffer = data;
            }
            else if (data instanceof ArrayBuffer) {
                buffer = Buffer.from(data);
            }
            else if (ArrayBuffer.isView(data)) {
                buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
            }
            else if (typeof data === 'object') {
                const keys = Object.keys(data);
                if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
                    const bytes = new Uint8Array(keys.length);
                    keys.forEach(k => bytes[Number(k)] = data[k]);
                    buffer = Buffer.from(bytes);
                    this.logger.log(`Converted object to buffer: ${buffer.length} bytes`);
                }
                else if (data.data) {
                    buffer = Buffer.from(data.data);
                }
                else {
                    this.logger.error('Received audio chunk as object but cannot parse:', Object.keys(data).slice(0, 10));
                    return;
                }
            }
            else if (Array.isArray(data)) {
                buffer = Buffer.from(data);
            }
            else {
                this.logger.error('Received audio chunk in unsupported format:', typeof data);
                return;
            }
            await this.meetingRecorderService.writeAudioChunk(session.meetingId, buffer);
        }
        catch (error) {
            this.logger.error(`Failed to write audio chunk for ${session.meetingId}:`, error);
            client.emit('CHUNK_ERROR', {
                error: error.message,
                timestamp: Date.now(),
            });
        }
    }
    async handleSpeakerEvent(event, client) {
        const session = this.clientSessions.get(client.id);
        if (!session?.meetingId) {
            this.logger.warn(`Speaker event received without active session: ${client.id}`);
            return;
        }
        try {
            await this.meetingRecorderService.writeSpeakerEvent(session.meetingId, event);
        }
        catch (error) {
            this.logger.error(`Failed to write speaker event for ${session.meetingId}:`, error);
        }
    }
    async handleEndSession(payload, client) {
        try {
            this.logger.log(`End session request: ${payload.meetingId}`);
            await this.meetingRecorderService.endSession(payload.meetingId);
            const session = this.clientSessions.get(client.id);
            if (session) {
                session.meetingId = null;
            }
            client.emit('SESSION_ENDED', {
                meetingId: payload.meetingId,
                timestamp: Date.now(),
            });
            this.logger.log(`Session ended: ${payload.meetingId}`);
        }
        catch (error) {
            this.logger.error('Failed to end session:', error);
            client.emit('SESSION_ERROR', {
                error: error.message,
                timestamp: Date.now(),
            });
        }
    }
    async handleGetStatus(client) {
        const session = this.clientSessions.get(client.id);
        client.emit('STATUS', {
            hasActiveSession: !!session?.meetingId,
            meetingId: session?.meetingId || null,
            workspaceId: session?.workspaceId || null,
            connectedAt: session?.connectedAt || null,
            timestamp: Date.now(),
        });
    }
};
exports.MeetingRecorderGateway = MeetingRecorderGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], MeetingRecorderGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('START_SESSION'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [start_session_dto_1.StartSessionDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], MeetingRecorderGateway.prototype, "handleStartSession", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('AUDIO_CHUNK'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], MeetingRecorderGateway.prototype, "handleAudioChunk", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('SPEAKER_EVENT'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [speaker_event_dto_1.SpeakerEventDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], MeetingRecorderGateway.prototype, "handleSpeakerEvent", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('END_SESSION'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [end_session_dto_1.EndSessionDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], MeetingRecorderGateway.prototype, "handleEndSession", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('GET_STATUS'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], MeetingRecorderGateway.prototype, "handleGetStatus", null);
exports.MeetingRecorderGateway = MeetingRecorderGateway = MeetingRecorderGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/ws/meeting-recorder',
        cors: {
            origin: '*',
            credentials: true,
        },
        maxHttpBufferSize: 1e8,
        pingTimeout: 60000,
        pingInterval: 25000,
    }),
    __metadata("design:paramtypes", [meeting_recorder_service_1.MeetingRecorderService])
], MeetingRecorderGateway);
//# sourceMappingURL=meeting-recorder.gateway.js.map